import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Pack Health Calculator Tests
 * 
 * These tests verify the critical "math must work" requirements
 */

// Mock types for testing
interface MockTier {
  id: string;
  name: string;
}

interface MockGuarantee {
  tierId: string;
  minCount: number;
  tier: MockTier;
}

interface MockTierWeight {
  tierId: string;
  weight: number;
  tier: MockTier;
}

interface MockPackConfig {
  guarantees: MockGuarantee[];
  tierWeights: MockTierWeight[];
}

interface MockPack {
  id: string;
  maxSupply: number | null;
  soldCount: number;
  config: MockPackConfig | null;
}

interface MockItemCount {
  tierId: string;
  _count: { id: number };
}

// Simplified health calculator for unit testing
// (In production, this uses Prisma and Redis - here we test the logic)
function calculatePackHealthLogic(
  pack: MockPack,
  availableByTier: MockItemCount[]
): {
  status: "SELLABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
  canSellOne: boolean;
  tierHealth: Array<{
    tierId: string;
    available: number;
    required: number;
    healthy: boolean;
  }>;
  warnings: string[];
} {
  if (!pack.config) {
    return {
      status: "OUT_OF_STOCK",
      canSellOne: false,
      tierHealth: [],
      warnings: ["Pack has no configuration"],
    };
  }

  const tierAvailability: Record<string, number> = {};
  for (const tier of availableByTier) {
    tierAvailability[tier.tierId] = tier._count.id;
  }

  const remainingPacks = pack.maxSupply
    ? pack.maxSupply - pack.soldCount
    : Infinity;

  if (remainingPacks <= 0) {
    return {
      status: "OUT_OF_STOCK",
      canSellOne: false,
      tierHealth: [],
      warnings: ["Maximum supply reached"],
    };
  }

  const tierHealth: Array<{
    tierId: string;
    available: number;
    required: number;
    healthy: boolean;
  }> = [];
  const warnings: string[] = [];
  let canSellOne = true;

  // Check hard guarantees
  for (const guarantee of pack.config.guarantees) {
    const available = tierAvailability[guarantee.tierId] || 0;
    const requiredTotal =
      remainingPacks === Infinity
        ? guarantee.minCount
        : remainingPacks * guarantee.minCount;

    const healthy = available >= requiredTotal;

    tierHealth.push({
      tierId: guarantee.tierId,
      available,
      required: requiredTotal === Infinity ? guarantee.minCount : requiredTotal,
      healthy,
    });

    if (!healthy) {
      canSellOne = false;
      warnings.push(
        `Insufficient ${guarantee.tier.name} items: ${available} available, ${requiredTotal} required`
      );
    }
  }

  // Check tier weights have at least 1 item
  for (const weight of pack.config.tierWeights) {
    if (weight.weight > 0) {
      const available = tierAvailability[weight.tierId] || 0;

      if (tierHealth.some((th) => th.tierId === weight.tierId)) {
        continue;
      }

      const healthy = available > 0;
      tierHealth.push({
        tierId: weight.tierId,
        available,
        required: 1,
        healthy,
      });

      if (!healthy) {
        warnings.push(`${weight.tier.name} tier is empty but has weight`);
      }
    }
  }

  let status: "SELLABLE" | "LOW_STOCK" | "OUT_OF_STOCK" = "SELLABLE";
  if (!canSellOne) {
    status = "OUT_OF_STOCK";
  } else {
    const lowStockThreshold = 0.2;
    const hasLowStock = tierHealth.some((th) => {
      if (!th.healthy) return false;
      const percentage = th.required > 0 ? th.available / th.required : 1;
      return percentage <= lowStockThreshold;
    });
    if (hasLowStock) {
      status = "LOW_STOCK";
    }
  }

  return { status, canSellOne, tierHealth, warnings };
}

describe("PackHealthCalculator", () => {
  const legendaryTier: MockTier = { id: "tier-legendary", name: "Legendary" };
  const epicTier: MockTier = { id: "tier-epic", name: "Epic" };
  const rareTier: MockTier = { id: "tier-rare", name: "Rare" };
  const commonTier: MockTier = { id: "tier-common", name: "Common" };

  describe("Hard Guarantee Checks", () => {
    it("should mark pack as SELLABLE when inventory meets all guarantees", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 0,
        config: {
          guarantees: [{ tierId: "tier-rare", minCount: 1, tier: rareTier }],
          tierWeights: [
            { tierId: "tier-rare", weight: 30, tier: rareTier },
            { tierId: "tier-common", weight: 70, tier: commonTier },
          ],
        },
      };

      const available: MockItemCount[] = [
        { tierId: "tier-rare", _count: { id: 15 } },
        { tierId: "tier-common", _count: { id: 50 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("SELLABLE");
      expect(result.canSellOne).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should mark pack as OUT_OF_STOCK when guarantee cannot be met", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 0,
        config: {
          guarantees: [{ tierId: "tier-rare", minCount: 1, tier: rareTier }],
          tierWeights: [{ tierId: "tier-rare", weight: 100, tier: rareTier }],
        },
      };

      // Only 5 rare items but need 10 (1 per pack * 10 packs)
      const available: MockItemCount[] = [
        { tierId: "tier-rare", _count: { id: 5 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("OUT_OF_STOCK");
      expect(result.canSellOne).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Insufficient");
    });

    it("should handle multiple guarantees", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 5,
        soldCount: 0,
        config: {
          guarantees: [
            { tierId: "tier-epic", minCount: 1, tier: epicTier },
            { tierId: "tier-rare", minCount: 2, tier: rareTier },
          ],
          tierWeights: [
            { tierId: "tier-epic", weight: 20, tier: epicTier },
            { tierId: "tier-rare", weight: 80, tier: rareTier },
          ],
        },
      };

      // Need 5 epic and 10 rare
      const available: MockItemCount[] = [
        { tierId: "tier-epic", _count: { id: 5 } },
        { tierId: "tier-rare", _count: { id: 10 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("SELLABLE");
      expect(result.canSellOne).toBe(true);
    });

    it("should fail if any guarantee is not met", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 5,
        soldCount: 0,
        config: {
          guarantees: [
            { tierId: "tier-epic", minCount: 1, tier: epicTier },
            { tierId: "tier-rare", minCount: 2, tier: rareTier },
          ],
          tierWeights: [
            { tierId: "tier-epic", weight: 20, tier: epicTier },
            { tierId: "tier-rare", weight: 80, tier: rareTier },
          ],
        },
      };

      // Enough epic but not enough rare
      const available: MockItemCount[] = [
        { tierId: "tier-epic", _count: { id: 5 } },
        { tierId: "tier-rare", _count: { id: 5 } }, // Need 10
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("OUT_OF_STOCK");
      expect(result.canSellOne).toBe(false);
    });
  });

  describe("Supply Limits", () => {
    it("should mark as OUT_OF_STOCK when maxSupply reached", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 10, // All sold
        config: {
          guarantees: [],
          tierWeights: [{ tierId: "tier-common", weight: 100, tier: commonTier }],
        },
      };

      const available: MockItemCount[] = [
        { tierId: "tier-common", _count: { id: 100 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("OUT_OF_STOCK");
      expect(result.canSellOne).toBe(false);
    });

    it("should handle unlimited supply packs", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: null, // Unlimited
        soldCount: 1000,
        config: {
          guarantees: [{ tierId: "tier-common", minCount: 1, tier: commonTier }],
          tierWeights: [{ tierId: "tier-common", weight: 100, tier: commonTier }],
        },
      };

      const available: MockItemCount[] = [
        { tierId: "tier-common", _count: { id: 10 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      // For unlimited packs, we only check if we have at least 1 item per guarantee
      expect(result.status).toBe("SELLABLE");
      expect(result.canSellOne).toBe(true);
    });
  });

  describe("Tier Weight Validation", () => {
    it("should warn when weighted tier has no items", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 0,
        config: {
          guarantees: [], // No guarantees
          tierWeights: [
            { tierId: "tier-legendary", weight: 5, tier: legendaryTier },
            { tierId: "tier-common", weight: 95, tier: commonTier },
          ],
        },
      };

      const available: MockItemCount[] = [
        // No legendary items!
        { tierId: "tier-common", _count: { id: 100 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      // Should still be sellable (no hard guarantee)
      expect(result.status).toBe("SELLABLE");
      expect(result.warnings.some((w) => w.includes("Legendary"))).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle pack with no config", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 0,
        config: null,
      };

      const result = calculatePackHealthLogic(pack, []);

      expect(result.status).toBe("OUT_OF_STOCK");
      expect(result.canSellOne).toBe(false);
      expect(result.warnings).toContain("Pack has no configuration");
    });

    it("should handle empty inventory", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 0,
        config: {
          guarantees: [{ tierId: "tier-common", minCount: 1, tier: commonTier }],
          tierWeights: [{ tierId: "tier-common", weight: 100, tier: commonTier }],
        },
      };

      const result = calculatePackHealthLogic(pack, []);

      expect(result.status).toBe("OUT_OF_STOCK");
      expect(result.canSellOne).toBe(false);
    });

    it("should correctly calculate remaining packs after sales", () => {
      const pack: MockPack = {
        id: "pack-1",
        maxSupply: 10,
        soldCount: 7, // 3 remaining
        config: {
          guarantees: [{ tierId: "tier-rare", minCount: 1, tier: rareTier }],
          tierWeights: [{ tierId: "tier-rare", weight: 100, tier: rareTier }],
        },
      };

      // Exactly 3 rare items for 3 remaining packs
      const available: MockItemCount[] = [
        { tierId: "tier-rare", _count: { id: 3 } },
      ];

      const result = calculatePackHealthLogic(pack, available);

      expect(result.status).toBe("SELLABLE");
      expect(result.canSellOne).toBe(true);
    });
  });
});

describe("Weighted Random Selection", () => {
  it("should select items based on weighted probabilities", () => {
    // Test weighted selection logic
    const weights = [
      { tierId: "legendary", weight: 5 },
      { tierId: "epic", weight: 15 },
      { tierId: "rare", weight: 30 },
      { tierId: "common", weight: 50 },
    ];

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const results: Record<string, number> = {};

    // Simulate 10000 selections
    for (let i = 0; i < 10000; i++) {
      const roll = Math.random() * totalWeight;
      let cumulative = 0;
      
      for (const w of weights) {
        cumulative += w.weight;
        if (roll < cumulative) {
          results[w.tierId] = (results[w.tierId] || 0) + 1;
          break;
        }
      }
    }

    // Check that distribution is roughly correct (within 5% tolerance)
    const tolerance = 0.05;
    for (const w of weights) {
      const expected = w.weight / totalWeight;
      const actual = (results[w.tierId] || 0) / 10000;
      expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
    }
  });
});


