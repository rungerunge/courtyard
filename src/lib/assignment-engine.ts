import prisma from "./prisma";
import { withLock, invalidatePackHealth, invalidatePackHealthForItem, canSellPack, updatePackStatusFromHealth } from "./pack-health";
import { redis } from "./redis";
import { ItemStatus, OpeningStatus, PackStatus, HoldingStatus } from "@prisma/client";
import type { PackOpeningResult, ItemWithTier } from "@/types";

/**
 * Assignment Engine
 * 
 * Handles the atomic assignment of items to pack openings
 * 
 * CRITICAL: This is the core business logic that ensures:
 * 1. Items are only assigned once (no double-assignment)
 * 2. Pack health is respected (no overselling)
 * 3. All operations are atomic (no partial states)
 * 
 * The flow:
 * 1. Acquire distributed lock for the pack
 * 2. Verify pack health allows sale
 * 3. Select item using weighted random from available pool
 * 4. Update item status to ASSIGNED
 * 5. Create Assignment record
 * 6. Create VaultHolding record
 * 7. Increment pack soldCount
 * 8. Update pack health/status
 * 9. Release lock
 */

/**
 * Assign an item to a pack opening
 * 
 * This is called AFTER payment is confirmed
 */
export async function assignItemToOpening(
  openingId: string
): Promise<PackOpeningResult> {
  // Get the opening with pack details
  const opening = await prisma.packOpening.findUnique({
    where: { id: openingId },
    include: {
      packProduct: {
        include: {
          config: {
            include: {
              guarantees: { include: { tier: true } },
              tierWeights: { include: { tier: true } },
            },
          },
        },
      },
    },
  });

  if (!opening) {
    throw new Error(`Opening not found: ${openingId}`);
  }

  if (opening.status !== OpeningStatus.PROCESSING) {
    throw new Error(`Opening is not in PROCESSING state: ${opening.status}`);
  }

  if (opening.assignment) {
    throw new Error(`Opening already has an assignment`);
  }

  const pack = opening.packProduct;
  const lockKey = `pack:${pack.id}:assignment`;

  // Execute with distributed lock
  return withLock(lockKey, async () => {
    // Double-check pack health inside lock
    const canSell = await canSellPack(pack.id);
    if (!canSell) {
      throw new Error("Pack is out of stock");
    }

    // Select item using weighted random from available pool
    const selectedItem = await selectItemFromPool(pack.id, pack.config);

    if (!selectedItem) {
      throw new Error("No available items in pack pool");
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lock the item row for update
      const item = await tx.item.findUnique({
        where: { id: selectedItem.id },
        include: { tier: true },
      });

      if (!item || item.status !== ItemStatus.AVAILABLE) {
        throw new Error(`Item ${selectedItem.id} is no longer available`);
      }

      // Update item status to ASSIGNED
      await tx.item.update({
        where: { id: item.id },
        data: { status: ItemStatus.ASSIGNED },
      });

      // Create immutable Assignment record
      const assignment = await tx.assignment.create({
        data: {
          openingId,
          itemId: item.id,
          valueAtAssignment: item.estimatedValue,
          tierAtAssignment: item.tier.name,
        },
      });

      // Create VaultHolding for the user
      await tx.vaultHolding.create({
        data: {
          userId: opening.userId,
          itemId: item.id,
          assignmentId: assignment.id,
          status: HoldingStatus.HOLDING,
        },
      });

      // Update opening status
      await tx.packOpening.update({
        where: { id: openingId },
        data: {
          status: OpeningStatus.COMPLETED,
          assignedAt: new Date(),
        },
      });

      // Increment pack sold count
      await tx.packProduct.update({
        where: { id: pack.id },
        data: { soldCount: { increment: 1 } },
      });

      return {
        openingId,
        item: item as ItemWithTier,
        assignmentId: assignment.id,
        tier: item.tier,
        estimatedValue: item.estimatedValue,
      };
    });

    // Invalidate health cache (outside transaction)
    await invalidatePackHealth(pack.id);
    await invalidatePackHealthForItem(selectedItem.id);

    // Check if pack should be marked out of stock
    await updatePackStatusFromHealth(pack.id);

    return result;
  }, { ttlSeconds: 30, maxRetries: 3, retryDelayMs: 200 });
}

/**
 * Select an item from the pack pool using weighted random selection
 */
async function selectItemFromPool(
  packProductId: string,
  config: {
    guarantees: { tierId: string; minCount: number; tier: { name: string } }[];
    tierWeights: { tierId: string; weight: number; tier: { name: string } }[];
  } | null
): Promise<{ id: string; tierId: string } | null> {
  if (!config) {
    throw new Error("Pack has no configuration");
  }

  // Get available items grouped by tier
  const availableItems = await prisma.item.findMany({
    where: {
      packPoolItems: {
        some: { packProductId },
      },
      status: ItemStatus.AVAILABLE,
    },
    select: {
      id: true,
      tierId: true,
      estimatedValue: true,
    },
  });

  if (availableItems.length === 0) {
    return null;
  }

  // Group by tier
  const itemsByTier: Record<string, typeof availableItems> = {};
  for (const item of availableItems) {
    if (!itemsByTier[item.tierId]) {
      itemsByTier[item.tierId] = [];
    }
    itemsByTier[item.tierId].push(item);
  }

  // Calculate total weight (only for tiers that have items)
  let totalWeight = 0;
  const activeWeights: { tierId: string; weight: number }[] = [];

  for (const tw of config.tierWeights) {
    if (itemsByTier[tw.tierId]?.length > 0) {
      totalWeight += tw.weight;
      activeWeights.push({ tierId: tw.tierId, weight: tw.weight });
    }
  }

  if (totalWeight === 0 || activeWeights.length === 0) {
    // Fallback: select from any available item
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    return availableItems[randomIndex];
  }

  // Select tier based on weighted random
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let selectedTierId: string | null = null;

  for (const tw of activeWeights) {
    cumulative += tw.weight;
    if (roll < cumulative) {
      selectedTierId = tw.tierId;
      break;
    }
  }

  // Fallback to last tier if somehow not selected
  if (!selectedTierId) {
    selectedTierId = activeWeights[activeWeights.length - 1].tierId;
  }

  // Select random item from the chosen tier
  const tierItems = itemsByTier[selectedTierId];
  if (!tierItems || tierItems.length === 0) {
    // Shouldn't happen, but fallback
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    return availableItems[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * tierItems.length);
  return tierItems[randomIndex];
}

/**
 * Reserve an item temporarily during checkout
 * 
 * This prevents race conditions where multiple users
 * try to buy the last available item
 */
export async function reserveItemForCheckout(
  packProductId: string,
  sessionId: string,
  ttlSeconds: number = 300 // 5 minutes
): Promise<string | null> {
  const lockKey = `pack:${packProductId}:reserve`;

  return withLock(lockKey, async () => {
    // Find an available item
    const item = await prisma.item.findFirst({
      where: {
        packPoolItems: {
          some: { packProductId },
        },
        status: ItemStatus.AVAILABLE,
      },
      select: { id: true },
    });

    if (!item) {
      return null;
    }

    // Reserve the item
    await prisma.item.update({
      where: { id: item.id },
      data: { status: ItemStatus.RESERVED },
    });

    // Store reservation in Redis with TTL
    await redis.set(
      `reservation:${sessionId}`,
      JSON.stringify({ itemId: item.id, packProductId }),
      "EX",
      ttlSeconds
    );

    return item.id;
  });
}

/**
 * Release a reserved item if checkout fails/expires
 */
export async function releaseReservation(sessionId: string): Promise<void> {
  const reservationData = await redis.get(`reservation:${sessionId}`);
  
  if (!reservationData) {
    return;
  }

  const { itemId, packProductId } = JSON.parse(reservationData);

  // Release the item back to available
  await prisma.item.update({
    where: { id: itemId },
    data: { status: ItemStatus.AVAILABLE },
  });

  // Delete the reservation
  await redis.del(`reservation:${sessionId}`);

  // Invalidate health cache
  await invalidatePackHealth(packProductId);
}

/**
 * Handle payment confirmed webhook
 * 
 * This is the entry point from Stripe webhooks
 */
export async function handlePaymentConfirmed(
  openingId: string
): Promise<PackOpeningResult> {
  // Update opening to PROCESSING
  await prisma.packOpening.update({
    where: { id: openingId },
    data: { 
      status: OpeningStatus.PROCESSING,
      paidAt: new Date(),
    },
  });

  // Assign item
  return assignItemToOpening(openingId);
}

/**
 * Handle payment failed webhook
 */
export async function handlePaymentFailed(openingId: string): Promise<void> {
  await prisma.packOpening.update({
    where: { id: openingId },
    data: { status: OpeningStatus.FAILED },
  });
}

/**
 * Mark opening as revealed (user has seen the result)
 */
export async function markOpeningRevealed(openingId: string): Promise<void> {
  await prisma.packOpening.update({
    where: { id: openingId },
    data: {
      status: OpeningStatus.REVEALED,
      revealedAt: new Date(),
    },
  });
}

/**
 * Get opening result for reveal page
 */
export async function getOpeningResult(
  openingId: string,
  userId: string
): Promise<PackOpeningResult | null> {
  const opening = await prisma.packOpening.findFirst({
    where: {
      id: openingId,
      userId,
      status: {
        in: [OpeningStatus.COMPLETED, OpeningStatus.REVEALED],
      },
    },
    include: {
      assignment: {
        include: {
          item: {
            include: { tier: true },
          },
        },
      },
    },
  });

  if (!opening || !opening.assignment) {
    return null;
  }

  return {
    openingId: opening.id,
    item: opening.assignment.item as ItemWithTier,
    assignmentId: opening.assignment.id,
    tier: opening.assignment.item.tier,
    estimatedValue: opening.assignment.item.estimatedValue,
  };
}


