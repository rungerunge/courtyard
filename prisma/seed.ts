import { PrismaClient, ItemStatus, PackStatus, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Courtyard MVP - Database Seed Script
 */

const prisma = new PrismaClient();

// Using placehold.co for reliable placeholder images
const PACK_IMAGES = {
  standard: "https://placehold.co/400x500/292d2e/61ec7d?text=Mystery+Pack",
  premium: "https://placehold.co/400x500/292d2e/a855f7?text=Premium+Pack",
  legendary: "https://placehold.co/400x500/292d2e/fbbf24?text=Legendary+Pack",
};

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data first (order matters for foreign keys)
  console.log("Cleaning existing data...");
  await prisma.listing.deleteMany();
  await prisma.shipmentRequest.deleteMany();
  await prisma.vaultHolding.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.packOpening.deleteMany();
  await prisma.packPoolItem.deleteMany();
  await prisma.packTierWeight.deleteMany();
  await prisma.packGuarantee.deleteMany();
  await prisma.packConfig.deleteMany();
  await prisma.packProduct.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemTier.deleteMany();
  await prisma.auditLog.deleteMany();

  // ============================================
  // Create Item Tiers
  // ============================================
  console.log("Creating item tiers...");

  const legendary = await prisma.itemTier.create({
    data: {
      name: "Legendary",
      displayOrder: 1,
      color: "#fbbf24",
      minValue: 50000,
      maxValue: null,
    },
  });

  const epic = await prisma.itemTier.create({
    data: {
      name: "Epic",
      displayOrder: 2,
      color: "#a855f7",
      minValue: 10000,
      maxValue: 49999,
    },
  });

  const rare = await prisma.itemTier.create({
    data: {
      name: "Rare",
      displayOrder: 3,
      color: "#3b82f6",
      minValue: 2500,
      maxValue: 9999,
    },
  });

  const common = await prisma.itemTier.create({
    data: {
      name: "Common",
      displayOrder: 4,
      color: "#9ca3af",
      minValue: 100,
      maxValue: 2499,
    },
  });

  console.log("Created 4 tiers");

  // ============================================
  // Create Items - Need enough for pack guarantees!
  // Standard pack: 100 supply, needs 100+ common
  // Premium pack: 50 supply, needs 50+ rare
  // Legendary pack: 20 supply, needs 20+ epic
  // ============================================
  console.log("Creating items...");

  const items: Array<{
    sku: string;
    name: string;
    description: string;
    images: string[];
    tierId: string;
    collection: string;
    condition: string;
    estimatedValue: number;
    status: ItemStatus;
  }> = [];

  // Legendary items (10 items)
  const legendaryNames = [
    "Charizard Holo 1st Edition",
    "Blastoise Holo 1st Edition",
    "Venusaur Holo 1st Edition",
    "Pikachu Illustrator Promo",
    "Shadowless Charizard",
    "Gold Star Charizard",
    "Shining Charizard",
    "Crystal Charizard",
    "Charizard ex",
    "Charizard VMAX Rainbow",
  ];

  for (let i = 0; i < 10; i++) {
    items.push({
      sku: `LEG-${String(i + 1).padStart(4, "0")}`,
      name: legendaryNames[i],
      description: "An extremely rare and valuable legendary card.",
      images: [`https://placehold.co/300x420/1a1a1a/fbbf24?text=${encodeURIComponent(legendaryNames[i].split(' ')[0])}`],
      tierId: legendary.id,
      collection: "Pokemon",
      condition: "PSA 10",
      estimatedValue: 100000 + Math.floor(Math.random() * 900000),
      status: ItemStatus.AVAILABLE,
    });
  }

  // Epic items (30 items) - Need 20+ for legendary pack
  const epicNames = [
    "Mewtwo Holo", "Gyarados Holo", "Alakazam Holo", "Machamp Holo", "Nidoking Holo",
    "Dragonite Holo", "Gengar Holo", "Lapras Holo", "Articuno Holo", "Zapdos Holo",
    "Moltres Holo", "Mew Holo", "Snorlax Holo", "Aerodactyl Holo", "Kabutops Holo",
    "Omastar Holo", "Clefable Holo", "Wigglytuff Holo", "Vileplume Holo", "Poliwrath Holo",
    "Golem Holo", "Rapidash Holo", "Magneton Holo", "Electrode Holo", "Hypno Holo",
    "Haunter Holo", "Kadabra Holo", "Primeape Holo", "Arcanine Holo", "Ninetales Holo",
  ];

  for (let i = 0; i < 30; i++) {
    items.push({
      sku: `EPC-${String(i + 1).padStart(4, "0")}`,
      name: epicNames[i],
      description: "A valuable epic holo card.",
      images: [`https://placehold.co/300x420/1a1a1a/a855f7?text=${encodeURIComponent(epicNames[i].split(' ')[0])}`],
      tierId: epic.id,
      collection: "Pokemon",
      condition: "PSA 8",
      estimatedValue: 15000 + Math.floor(Math.random() * 30000),
      status: ItemStatus.AVAILABLE,
    });
  }

  // Rare items (60 items) - Need 50+ for premium pack
  const rareNames = [
    "Raichu", "Chansey", "Clefairy", "Hitmonchan", "Ninetales",
    "Poliwrath", "Pidgeotto", "Dewgong", "Dugtrio", "Electabuzz",
  ];

  for (let i = 0; i < 60; i++) {
    items.push({
      sku: `RAR-${String(i + 1).padStart(4, "0")}`,
      name: `${rareNames[i % 10]} #${Math.floor(i / 10) + 1}`,
      description: "A rare Pokemon card.",
      images: [`https://placehold.co/300x420/1a1a1a/3b82f6?text=${encodeURIComponent(rareNames[i % 10])}`],
      tierId: rare.id,
      collection: "Pokemon",
      condition: "Near Mint",
      estimatedValue: 3000 + Math.floor(Math.random() * 6000),
      status: ItemStatus.AVAILABLE,
    });
  }

  // Common items (120 items) - Need 100+ for standard pack
  const commonNames = [
    "Pikachu", "Charmander", "Squirtle", "Bulbasaur", "Eevee",
    "Jigglypuff", "Meowth", "Psyduck", "Geodude", "Magikarp",
  ];

  for (let i = 0; i < 120; i++) {
    items.push({
      sku: `COM-${String(i + 1).padStart(4, "0")}`,
      name: `${commonNames[i % 10]} #${Math.floor(i / 10) + 1}`,
      description: "A classic Pokemon card.",
      images: [`https://placehold.co/300x420/1a1a1a/9ca3af?text=${encodeURIComponent(commonNames[i % 10])}`],
      tierId: common.id,
      collection: "Pokemon",
      condition: "Good",
      estimatedValue: 200 + Math.floor(Math.random() * 1500),
      status: ItemStatus.AVAILABLE,
    });
  }

  // Insert all items
  const createdItems = await prisma.item.createMany({
    data: items,
    skipDuplicates: true,
  });
  console.log(`Created ${createdItems.count} items`);

  // Get all created items
  const allItems = await prisma.item.findMany();

  // ============================================
  // Create Pack Products
  // ============================================
  console.log("Creating pack products...");

  // Pack 1: Standard Mystery Pack (100 supply)
  const standardPack = await prisma.packProduct.create({
    data: {
      name: "Mystery Pack",
      description: "The classic mystery pack! Contains one random card with chances at all tiers. Guaranteed at least a Common card.",
      images: [PACK_IMAGES.standard],
      priceInCents: 1999,
      maxSupply: 100,
      soldCount: 0,
      status: PackStatus.ACTIVE,
      displayOrder: 1,
      featured: false,
      config: {
        create: {
          description: "Standard pack",
          guarantees: {
            create: [
              { tierId: common.id, minCount: 1 },
            ],
          },
          tierWeights: {
            create: [
              { tierId: legendary.id, weight: 1 },
              { tierId: epic.id, weight: 5 },
              { tierId: rare.id, weight: 20 },
              { tierId: common.id, weight: 74 },
            ],
          },
        },
      },
    },
  });

  // Pack 2: Premium Pack (50 supply)
  const premiumPack = await prisma.packProduct.create({
    data: {
      name: "Premium Pack",
      description: "Better odds at rare and epic cards! Guaranteed at least a Rare card with boosted chances at Epic and Legendary.",
      images: [PACK_IMAGES.premium],
      priceInCents: 4999,
      maxSupply: 50,
      soldCount: 0,
      status: PackStatus.ACTIVE,
      displayOrder: 2,
      featured: true,
      config: {
        create: {
          description: "Premium pack",
          guarantees: {
            create: [
              { tierId: rare.id, minCount: 1 },
            ],
          },
          tierWeights: {
            create: [
              { tierId: legendary.id, weight: 5 },
              { tierId: epic.id, weight: 25 },
              { tierId: rare.id, weight: 70 },
            ],
          },
        },
      },
    },
  });

  // Pack 3: Legendary Pack (20 supply)
  const legendaryPack = await prisma.packProduct.create({
    data: {
      name: "Legendary Pack",
      description: "The ultimate chase pack! Guaranteed Epic or better with 20% odds at a Legendary card!",
      images: [PACK_IMAGES.legendary],
      priceInCents: 14999,
      maxSupply: 20,
      soldCount: 0,
      status: PackStatus.ACTIVE,
      displayOrder: 3,
      featured: true,
      config: {
        create: {
          description: "Legendary pack",
          guarantees: {
            create: [
              { tierId: epic.id, minCount: 1 },
            ],
          },
          tierWeights: {
            create: [
              { tierId: legendary.id, weight: 20 },
              { tierId: epic.id, weight: 80 },
            ],
          },
        },
      },
    },
  });

  console.log("Created 3 pack products");

  // ============================================
  // Add Items to Pack Pools
  // ============================================
  console.log("Adding items to pack pools...");

  // Standard pack: all items
  await prisma.packPoolItem.createMany({
    data: allItems.map((item) => ({
      packProductId: standardPack.id,
      itemId: item.id,
    })),
    skipDuplicates: true,
  });

  // Premium pack: rare and above only
  const premiumItems = allItems.filter(
    (item) => item.tierId === legendary.id || item.tierId === epic.id || item.tierId === rare.id
  );
  await prisma.packPoolItem.createMany({
    data: premiumItems.map((item) => ({
      packProductId: premiumPack.id,
      itemId: item.id,
    })),
    skipDuplicates: true,
  });

  // Legendary pack: epic and legendary only
  const legendaryItems = allItems.filter(
    (item) => item.tierId === legendary.id || item.tierId === epic.id
  );
  await prisma.packPoolItem.createMany({
    data: legendaryItems.map((item) => ({
      packProductId: legendaryPack.id,
      itemId: item.id,
    })),
    skipDuplicates: true,
  });

  console.log("Added items to pack pools");

  // ============================================
  // Create Admin User
  // ============================================
  console.log("Creating admin user...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@courtyard.io" },
    update: {},
    create: {
      email: "admin@courtyard.io",
      passwordHash: adminPassword,
      name: "Super Admin",
      role: AdminRole.SUPER_ADMIN,
    },
  });

  console.log("Created admin user: admin@courtyard.io / admin123");

  // ============================================
  // Create Test User with Balance
  // ============================================
  console.log("Creating test user...");

  const userPassword = await bcrypt.hash("test123", 12);
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {
      balanceCents: 100000, // $1000 balance
    },
    create: {
      email: "test@example.com",
      passwordHash: userPassword,
      name: "Test User",
      balanceCents: 100000, // $1000 balance
    },
  });

  console.log("Created test user: test@example.com / test123 ($1000 balance)");

  // Summary
  console.log("\n✅ Seed completed successfully!");
  console.log("\n📝 Summary:");
  console.log("   - 4 item tiers created");
  console.log(`   - ${items.length} items created`);
  console.log("     - 10 Legendary items");
  console.log("     - 30 Epic items");
  console.log("     - 60 Rare items");
  console.log("     - 120 Common items");
  console.log("   - 3 pack products created");
  console.log("   - Admin: admin@courtyard.io / admin123");
  console.log("   - Test User: test@example.com / test123 ($1000 balance)");
  console.log("\n🚀 You can now test the app!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
