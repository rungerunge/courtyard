import prisma from "./prisma";
import { cacheGet, cacheSet, cacheDelete } from "./redis";
import type { PackHealth, TierHealth, PackHealthStatus } from "@/types";
import { ItemStatus, PackStatus } from "@prisma/client";

/**
 * Pack Health Calculator
 * 
 * THE MOST CRITICAL COMPONENT
 * 
 * This service calculates whether a pack can be sold based on:
 * 1. Hard guarantees - MUST be satisfiable for all remaining packs
 * 2. Tier availability - At least one item per tier with non-zero weight
 * 3. Supply limits - Cannot exceed maxSupply
 * 
 * The "math must work" requirement:
 * - If we have N packs remaining and guarantee G items of tier T per pack,
 *   we need at least N * G items of tier T available in the pool.
 */

const CACHE_TTL_SECONDS = 60; // Cache health for 1 minute
const LOW_STOCK_THRESHOLD = 0.2; // 20% buffer before warning

/**
 * Calculate the health status of a pack product
 */
export async function calculatePackHealth(
  packProductId: string
): Promise<PackHealth> {
  // Check cache first
  const cacheKey = `pack_health:${packProductId}`;
  const cached = await cacheGet<PackHealth>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Fetch pack with config and pool
  const pack = await prisma.packProduct.findUnique({
    where: { id: packProductId },
    include: {
      config: {
        include: {
          guarantees: {
            include: { tier: true },
          },
          tierWeights: {
            include: { tier: true },
          },
        },
      },
    },
  });

  if (!pack) {
    throw new Error(`Pack product not found: ${packProductId}`);
  }

  // Get available items in the pool grouped by tier
  const availableByTier = await prisma.item.groupBy({
    by: ["tierId"],
    where: {
      packPoolItems: {
        some: { packProductId },
      },
      status: ItemStatus.AVAILABLE,
    },
    _count: { id: true },
  });

  // Convert to map for easy lookup
  const tierAvailability: Record<string, number> = {};
  for (const tier of availableByTier) {
    tierAvailability[tier.tierId] = tier._count.id;
  }

  // Calculate remaining packs
  const remainingPacks = pack.maxSupply 
    ? pack.maxSupply - pack.soldCount 
    : Infinity;

  // If no config, pack is misconfigured
  if (!pack.config) {
    const health: PackHealth = {
      packProductId,
      status: "OUT_OF_STOCK",
      remainingPacks: remainingPacks === Infinity ? -1 : remainingPacks,
      maxSupply: pack.maxSupply,
      soldCount: pack.soldCount,
      tierHealth: [],
      canSellOne: false,
      warnings: ["Pack has no configuration"],
      calculatedAt: new Date(),
    };
    return health;
  }

  // Build tier health array
  const tierHealth: TierHealth[] = [];
  const warnings: string[] = [];
  let canSellOne = true;

  // Check hard guarantees
  for (const guarantee of pack.config.guarantees) {
    const available = tierAvailability[guarantee.tierId] || 0;
    const requiredTotal = remainingPacks === Infinity 
      ? guarantee.minCount 
      : remainingPacks * guarantee.minCount;
    
    const healthy = available >= requiredTotal;
    const percentage = requiredTotal > 0 
      ? Math.round((available / requiredTotal) * 100) 
      : 100;

    tierHealth.push({
      tierId: guarantee.tierId,
      tierName: guarantee.tier.name,
      available,
      required: requiredTotal === Infinity ? guarantee.minCount : requiredTotal,
      healthy,
      percentage: Math.min(percentage, 100),
    });

    if (!healthy) {
      canSellOne = false;
      warnings.push(
        `Insufficient ${guarantee.tier.name} items: ${available} available, ${requiredTotal} required for remaining packs`
      );
    } else if (percentage <= LOW_STOCK_THRESHOLD * 100) {
      warnings.push(
        `Low stock warning: ${guarantee.tier.name} at ${percentage}% capacity`
      );
    }
  }

  // Check tier weights - ensure at least 1 item exists for non-zero weighted tiers
  for (const weight of pack.config.tierWeights) {
    if (weight.weight > 0) {
      const available = tierAvailability[weight.tierId] || 0;
      
      // Skip if already in guarantees
      if (tierHealth.some(th => th.tierId === weight.tierId)) {
        continue;
      }

      const healthy = available > 0;
      
      tierHealth.push({
        tierId: weight.tierId,
        tierName: weight.tier.name,
        available,
        required: 1, // At least 1 for weighted selection
        healthy,
        percentage: available > 0 ? 100 : 0,
      });

      if (!healthy) {
        // For non-guaranteed tiers, this is a warning not a blocker
        // The weighted selection will skip empty tiers
        warnings.push(
          `${weight.tier.name} tier is empty but has weight ${weight.weight}`
        );
      }
    }
  }

  // Check if max supply reached
  if (pack.maxSupply && pack.soldCount >= pack.maxSupply) {
    canSellOne = false;
    warnings.push("Maximum supply reached");
  }

  // Determine overall status
  let status: PackHealthStatus = "SELLABLE";
  
  if (!canSellOne) {
    status = "OUT_OF_STOCK";
  } else {
    // Check if any guaranteed tier is running low
    const hasLowStock = tierHealth.some(
      th => th.healthy && th.percentage <= LOW_STOCK_THRESHOLD * 100
    );
    if (hasLowStock) {
      status = "LOW_STOCK";
    }
  }

  const health: PackHealth = {
    packProductId,
    status,
    remainingPacks: remainingPacks === Infinity ? -1 : remainingPacks,
    maxSupply: pack.maxSupply,
    soldCount: pack.soldCount,
    tierHealth,
    canSellOne,
    warnings,
    calculatedAt: new Date(),
  };

  // Cache the result
  await cacheSet(cacheKey, health, CACHE_TTL_SECONDS);

  return health;
}

/**
 * Check if a single pack can be sold right now
 * 
 * This is a quick check used during purchase flow
 */
export async function canSellPack(packProductId: string): Promise<boolean> {
  const health = await calculatePackHealth(packProductId);
  return health.canSellOne;
}

/**
 * Invalidate health cache for a pack
 * 
 * Call this after any inventory changes that affect the pack
 */
export async function invalidatePackHealth(packProductId: string): Promise<void> {
  await cacheDelete(`pack_health:${packProductId}`);
}

/**
 * Invalidate health cache for all packs containing an item
 */
export async function invalidatePackHealthForItem(itemId: string): Promise<void> {
  const poolItems = await prisma.packPoolItem.findMany({
    where: { itemId },
    select: { packProductId: true },
  });

  await Promise.all(
    poolItems.map(pi => invalidatePackHealth(pi.packProductId))
  );
}

/**
 * Update pack status based on health
 * 
 * Automatically marks packs as OUT_OF_STOCK when health fails
 */
export async function updatePackStatusFromHealth(
  packProductId: string
): Promise<PackStatus> {
  const health = await calculatePackHealth(packProductId);
  
  const pack = await prisma.packProduct.findUnique({
    where: { id: packProductId },
    select: { status: true },
  });

  if (!pack) {
    throw new Error(`Pack not found: ${packProductId}`);
  }

  // Only auto-update if currently ACTIVE
  if (pack.status === PackStatus.ACTIVE && !health.canSellOne) {
    await prisma.packProduct.update({
      where: { id: packProductId },
      data: { status: PackStatus.OUT_OF_STOCK },
    });
    return PackStatus.OUT_OF_STOCK;
  }

  return pack.status;
}

/**
 * Get health for all active packs
 */
export async function getAllPacksHealth(): Promise<PackHealth[]> {
  const packs = await prisma.packProduct.findMany({
    where: {
      status: {
        in: [PackStatus.ACTIVE, PackStatus.OUT_OF_STOCK, PackStatus.PAUSED],
      },
    },
    select: { id: true },
  });

  return Promise.all(packs.map(p => calculatePackHealth(p.id)));
}

/**
 * Simulate pack openings to validate distribution
 * 
 * FOR ADMIN QA ONLY - Does not actually assign items
 */
export async function simulatePackOpenings(
  packProductId: string,
  count: number = 10000
): Promise<{
  tierId: string;
  tierName: string;
  count: number;
  percentage: number;
  expectedPercentage: number;
  avgValue: number;
}[]> {
  const pack = await prisma.packProduct.findUnique({
    where: { id: packProductId },
    include: {
      config: {
        include: {
          guarantees: { include: { tier: true } },
          tierWeights: { include: { tier: true } },
        },
      },
      poolItems: {
        include: {
          item: {
            include: { tier: true },
          },
        },
      },
    },
  });

  if (!pack || !pack.config) {
    throw new Error("Pack or config not found");
  }

  // Get available items grouped by tier
  const itemsByTier: Record<string, { id: string; value: number }[]> = {};
  for (const poolItem of pack.poolItems) {
    if (poolItem.item.status === ItemStatus.AVAILABLE) {
      const tierId = poolItem.item.tierId;
      if (!itemsByTier[tierId]) {
        itemsByTier[tierId] = [];
      }
      itemsByTier[tierId].push({
        id: poolItem.item.id,
        value: poolItem.item.estimatedValue,
      });
    }
  }

  // Calculate total weights
  const totalWeight = pack.config.tierWeights.reduce(
    (sum, tw) => sum + tw.weight,
    0
  );

  // Run simulation
  const results: Record<string, { count: number; totalValue: number }> = {};
  
  for (let i = 0; i < count; i++) {
    // Select tier based on weights
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedTierId: string | null = null;

    for (const tw of pack.config.tierWeights) {
      cumulative += tw.weight;
      if (roll < cumulative && itemsByTier[tw.tierId]?.length > 0) {
        selectedTierId = tw.tierId;
        break;
      }
    }

    // Fallback to first available tier if selected is empty
    if (!selectedTierId) {
      selectedTierId = Object.keys(itemsByTier)[0];
    }

    if (selectedTierId && itemsByTier[selectedTierId]) {
      const items = itemsByTier[selectedTierId];
      const item = items[Math.floor(Math.random() * items.length)];
      
      if (!results[selectedTierId]) {
        results[selectedTierId] = { count: 0, totalValue: 0 };
      }
      results[selectedTierId].count++;
      results[selectedTierId].totalValue += item.value;
    }
  }

  // Format results
  const tierMap = new Map(
    pack.config.tierWeights.map(tw => [tw.tierId, tw])
  );

  return Object.entries(results).map(([tierId, data]) => {
    const tw = tierMap.get(tierId);
    const expectedPercentage = tw 
      ? (tw.weight / totalWeight) * 100 
      : 0;

    return {
      tierId,
      tierName: tw?.tier.name || "Unknown",
      count: data.count,
      percentage: (data.count / count) * 100,
      expectedPercentage,
      avgValue: data.totalValue / data.count,
    };
  });
}




