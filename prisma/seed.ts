import { PrismaClient, ItemStatus, PackStatus, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Courtyard MVP - Database Seed Script
 * 
 * Creates sample data for development and testing:
 * - Item tiers (Legendary, Epic, Rare, Common)
 * - Sample items across all tiers
 * - Sample pack products with configurations
 * - Initial admin user
 */

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ============================================
  // Create Item Tiers
  // ============================================
  console.log("Creating item tiers...");

  const tiers = await Promise.all([
    prisma.itemTier.upsert({
      where: { name: "Legendary" },
      update: {},
      create: {
        name: "Legendary",
        displayOrder: 1,
        color: "#fbbf24",
        minValue: 50000, // $500+
        maxValue: null,
      },
    }),
    prisma.itemTier.upsert({
      where: { name: "Epic" },
      update: {},
      create: {
        name: "Epic",
        displayOrder: 2,
        color: "#a855f7",
        minValue: 10000, // $100-$500
        maxValue: 49999,
      },
    }),
    prisma.itemTier.upsert({
      where: { name: "Rare" },
      update: {},
      create: {
        name: "Rare",
        displayOrder: 3,
        color: "#3b82f6",
        minValue: 2500, // $25-$100
        maxValue: 9999,
      },
    }),
    prisma.itemTier.upsert({
      where: { name: "Common" },
      update: {},
      create: {
        name: "Common",
        displayOrder: 4,
        color: "#9ca3af",
        minValue: 100, // $1-$25
        maxValue: 2499,
      },
    }),
  ]);

  const [legendary, epic, rare, common] = tiers;
  console.log(`Created ${tiers.length} tiers`);

  // ============================================
  // Create Sample Items
  // ============================================
  console.log("Creating sample items...");

  const items = [];

  // Legendary items (5 items)
  const legendaryItems = [
    { name: "PSA 10 Charizard Holo 1st Edition", value: 35000000, collection: "Pokemon", condition: "PSA 10" },
    { name: "Michael Jordan Rookie PSA 9", value: 15000000, collection: "Sports Cards", condition: "PSA 9" },
    { name: "Black Lotus Beta MTG", value: 25000000, collection: "Magic: The Gathering", condition: "BGS 9" },
    { name: "LeBron James Rookie Auto PSA 10", value: 8000000, collection: "Sports Cards", condition: "PSA 10" },
    { name: "Pikachu Illustrator Promo", value: 50000000, collection: "Pokemon", condition: "CGC 8" },
  ];

  for (let i = 0; i < legendaryItems.length; i++) {
    const item = legendaryItems[i];
    items.push({
      sku: `LEG-${String(i + 1).padStart(4, "0")}`,
      name: item.name,
      description: `A legendary ${item.collection} collectible in ${item.condition} condition.`,
      images: [`https://placehold.co/400x600/fbbf24/000000?text=${encodeURIComponent(item.name.slice(0, 10))}`],
      tierId: legendary.id,
      collection: item.collection,
      condition: item.condition,
      estimatedValue: item.value,
      status: ItemStatus.AVAILABLE,
    });
  }

  // Epic items (15 items)
  const epicItems = [
    { name: "Kobe Bryant Rookie Card PSA 8", value: 25000, collection: "Sports Cards" },
    { name: "Blastoise Holo 1st Edition PSA 7", value: 35000, collection: "Pokemon" },
    { name: "Tom Brady Rookie Card PSA 9", value: 45000, collection: "Sports Cards" },
    { name: "Venusaur Holo Base Set PSA 8", value: 18000, collection: "Pokemon" },
    { name: "Shaquille O'Neal Rookie PSA 9", value: 12000, collection: "Sports Cards" },
    { name: "Mewtwo Holo 1st Edition PSA 8", value: 28000, collection: "Pokemon" },
    { name: "Patrick Mahomes Rookie Auto", value: 40000, collection: "Sports Cards" },
    { name: "Gyarados Holo Base Set PSA 9", value: 15000, collection: "Pokemon" },
    { name: "Luka Doncic Rookie Prizm Silver", value: 30000, collection: "Sports Cards" },
    { name: "Mox Sapphire Unlimited MTG", value: 35000, collection: "Magic: The Gathering" },
    { name: "Alakazam Holo 1st Edition PSA 7", value: 12000, collection: "Pokemon" },
    { name: "Ja Morant Rookie Auto PSA 10", value: 20000, collection: "Sports Cards" },
    { name: "Dragonite Holo 1st Edition PSA 8", value: 25000, collection: "Pokemon" },
    { name: "Stephen Curry Rookie Card PSA 9", value: 38000, collection: "Sports Cards" },
    { name: "Ancestral Recall Unlimited MTG", value: 42000, collection: "Magic: The Gathering" },
  ];

  for (let i = 0; i < epicItems.length; i++) {
    const item = epicItems[i];
    items.push({
      sku: `EPC-${String(i + 1).padStart(4, "0")}`,
      name: item.name,
      description: `An epic ${item.collection} collectible.`,
      images: [`https://placehold.co/400x600/a855f7/ffffff?text=${encodeURIComponent(item.name.slice(0, 10))}`],
      tierId: epic.id,
      collection: item.collection,
      condition: "Near Mint",
      estimatedValue: item.value,
      status: ItemStatus.AVAILABLE,
    });
  }

  // Rare items (30 items)
  const rareCollections = ["Pokemon", "Sports Cards", "Magic: The Gathering"];
  for (let i = 0; i < 30; i++) {
    const collection = rareCollections[i % 3];
    const value = 3000 + Math.floor(Math.random() * 6000); // $30-$90
    items.push({
      sku: `RAR-${String(i + 1).padStart(4, "0")}`,
      name: `Rare ${collection} Card #${i + 1}`,
      description: `A rare ${collection} collectible in great condition.`,
      images: [`https://placehold.co/400x600/3b82f6/ffffff?text=Rare+${i + 1}`],
      tierId: rare.id,
      collection,
      condition: "Excellent",
      estimatedValue: value,
      status: ItemStatus.AVAILABLE,
    });
  }

  // Common items (50 items)
  for (let i = 0; i < 50; i++) {
    const collection = rareCollections[i % 3];
    const value = 500 + Math.floor(Math.random() * 1500); // $5-$20
    items.push({
      sku: `COM-${String(i + 1).padStart(4, "0")}`,
      name: `Common ${collection} Card #${i + 1}`,
      description: `A common ${collection} collectible.`,
      images: [`https://placehold.co/400x600/9ca3af/ffffff?text=Common+${i + 1}`],
      tierId: common.id,
      collection,
      condition: "Good",
      estimatedValue: value,
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

  // Pack 1: Standard Mystery Pack
  const standardPack = await prisma.packProduct.create({
    data: {
      name: "Standard Mystery Pack",
      description: "A chance at rare collectibles! Contains one item from our vault. Every pack guaranteed to contain at least a Common tier item.",
      images: ["https://placehold.co/600x400/292d2e/61ec7d?text=Standard+Pack"],
      priceInCents: 2999, // $29.99
      maxSupply: 100,
      status: PackStatus.ACTIVE,
      displayOrder: 1,
      featured: false,
      config: {
        create: {
          description: "Standard pack with weighted odds",
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

  // Pack 2: Premium Mystery Pack
  const premiumPack = await prisma.packProduct.create({
    data: {
      name: "Premium Mystery Pack",
      description: "Higher odds at epic and legendary items! Guaranteed at least Rare tier or better.",
      images: ["https://placehold.co/600x400/292d2e/a855f7?text=Premium+Pack"],
      priceInCents: 9999, // $99.99
      maxSupply: 50,
      status: PackStatus.ACTIVE,
      displayOrder: 2,
      featured: true,
      config: {
        create: {
          description: "Premium pack with better odds",
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

  // Pack 3: Legendary Chase Pack
  const legendaryPack = await prisma.packProduct.create({
    data: {
      name: "Legendary Chase Pack",
      description: "The ultimate pack for serious collectors. Guaranteed Epic or better with highest legendary odds!",
      images: ["https://placehold.co/600x400/292d2e/fbbf24?text=Legendary+Pack"],
      priceInCents: 49999, // $499.99
      maxSupply: 10,
      status: PackStatus.ACTIVE,
      displayOrder: 3,
      featured: true,
      config: {
        create: {
          description: "Legendary chase pack",
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

  console.log(`Created 3 pack products`);

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

  // Premium pack: rare and above
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
  const legendaryItems2 = allItems.filter(
    (item) => item.tierId === legendary.id || item.tierId === epic.id
  );
  await prisma.packPoolItem.createMany({
    data: legendaryItems2.map((item) => ({
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
  // Create Test User
  // ============================================
  console.log("Creating test user...");

  const userPassword = await bcrypt.hash("test123", 12);
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash: userPassword,
      name: "Test User",
      balanceCents: 100000, // $1000 balance for testing
    },
  });

  console.log("Created test user: test@example.com / test123");

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

