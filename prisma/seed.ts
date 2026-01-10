import { PrismaClient, ItemStatus, PackStatus, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Courtyard MVP - Database Seed Script
 * 
 * Creates sample data for development and testing:
 * - Item tiers (Legendary, Epic, Rare, Common)
 * - Sample items with real card images
 * - Sample pack products with configurations
 * - Initial admin user and test user with balance
 */

const prisma = new PrismaClient();

// Real collectible card images for testing
const CARD_IMAGES = {
  pokemon: {
    legendary: [
      "https://images.pokemontcg.io/base1/4/high.png", // Charizard
      "https://images.pokemontcg.io/base1/2/high.png", // Blastoise
      "https://images.pokemontcg.io/base1/15/high.png", // Venusaur
    ],
    epic: [
      "https://images.pokemontcg.io/base1/10/high.png", // Mewtwo
      "https://images.pokemontcg.io/base1/6/high.png", // Gyarados
      "https://images.pokemontcg.io/base1/1/high.png", // Alakazam
      "https://images.pokemontcg.io/base1/8/high.png", // Machamp
      "https://images.pokemontcg.io/base1/11/high.png", // Nidoking
    ],
    rare: [
      "https://images.pokemontcg.io/base1/14/high.png", // Raichu
      "https://images.pokemontcg.io/base1/3/high.png", // Chansey
      "https://images.pokemontcg.io/base1/5/high.png", // Clefairy
      "https://images.pokemontcg.io/base1/7/high.png", // Hitmonchan
      "https://images.pokemontcg.io/base1/9/high.png", // Magneton
      "https://images.pokemontcg.io/base1/12/high.png", // Ninetales
      "https://images.pokemontcg.io/base1/13/high.png", // Poliwrath
    ],
    common: [
      "https://images.pokemontcg.io/base1/58/high.png", // Pikachu
      "https://images.pokemontcg.io/base1/46/high.png", // Charmander
      "https://images.pokemontcg.io/base1/63/high.png", // Squirtle
      "https://images.pokemontcg.io/base1/44/high.png", // Bulbasaur
      "https://images.pokemontcg.io/base1/49/high.png", // Drowzee
      "https://images.pokemontcg.io/base1/52/high.png", // Machop
      "https://images.pokemontcg.io/base1/55/high.png", // Nidoran
      "https://images.pokemontcg.io/base1/60/high.png", // Ponyta
    ],
  },
  // Pack images
  packs: {
    standard: "https://images.pokemontcg.io/base1/symbol.png",
    premium: "https://images.pokemontcg.io/base1/logo.png",
  }
};

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data first
  console.log("Cleaning existing data...");
  await prisma.packPoolItem.deleteMany();
  await prisma.packTierWeight.deleteMany();
  await prisma.packGuarantee.deleteMany();
  await prisma.packConfig.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.vaultHolding.deleteMany();
  await prisma.packOpening.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.shipmentRequest.deleteMany();
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
      minValue: 50000, // $500+
      maxValue: null,
    },
  });

  const epic = await prisma.itemTier.create({
    data: {
      name: "Epic",
      displayOrder: 2,
      color: "#a855f7",
      minValue: 10000, // $100-$500
      maxValue: 49999,
    },
  });

  const rare = await prisma.itemTier.create({
    data: {
      name: "Rare",
      displayOrder: 3,
      color: "#3b82f6",
      minValue: 2500, // $25-$100
      maxValue: 9999,
    },
  });

  const common = await prisma.itemTier.create({
    data: {
      name: "Common",
      displayOrder: 4,
      color: "#9ca3af",
      minValue: 100, // $1-$25
      maxValue: 2499,
    },
  });

  console.log("Created 4 tiers");

  // ============================================
  // Create Items
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

  // Legendary items
  const legendaryCards = [
    { name: "Charizard Holo 1st Edition Base Set", value: 35000000, condition: "PSA 10", img: CARD_IMAGES.pokemon.legendary[0] },
    { name: "Blastoise Holo 1st Edition Base Set", value: 15000000, condition: "PSA 9", img: CARD_IMAGES.pokemon.legendary[1] },
    { name: "Venusaur Holo 1st Edition Base Set", value: 12000000, condition: "PSA 9", img: CARD_IMAGES.pokemon.legendary[2] },
  ];

  legendaryCards.forEach((card, i) => {
    items.push({
      sku: `LEG-${String(i + 1).padStart(4, "0")}`,
      name: card.name,
      description: `A legendary Pokemon card in ${card.condition} condition. One of the most sought-after cards in the hobby.`,
      images: [card.img],
      tierId: legendary.id,
      collection: "Pokemon Base Set",
      condition: card.condition,
      estimatedValue: card.value,
      status: ItemStatus.AVAILABLE,
    });
  });

  // Epic items
  const epicCards = [
    { name: "Mewtwo Holo Base Set", value: 28000, condition: "PSA 8", img: CARD_IMAGES.pokemon.epic[0] },
    { name: "Gyarados Holo Base Set", value: 15000, condition: "PSA 9", img: CARD_IMAGES.pokemon.epic[1] },
    { name: "Alakazam Holo Base Set", value: 12000, condition: "PSA 7", img: CARD_IMAGES.pokemon.epic[2] },
    { name: "Machamp Holo 1st Edition", value: 20000, condition: "PSA 8", img: CARD_IMAGES.pokemon.epic[3] },
    { name: "Nidoking Holo Base Set", value: 18000, condition: "PSA 8", img: CARD_IMAGES.pokemon.epic[4] },
  ];

  epicCards.forEach((card, i) => {
    items.push({
      sku: `EPC-${String(i + 1).padStart(4, "0")}`,
      name: card.name,
      description: `An epic Pokemon card in ${card.condition} condition. A must-have for serious collectors.`,
      images: [card.img],
      tierId: epic.id,
      collection: "Pokemon Base Set",
      condition: card.condition,
      estimatedValue: card.value,
      status: ItemStatus.AVAILABLE,
    });
  });

  // Rare items
  const rareCards = [
    { name: "Raichu Holo Base Set", value: 5500, condition: "Near Mint", img: CARD_IMAGES.pokemon.rare[0] },
    { name: "Chansey Holo Base Set", value: 4500, condition: "Excellent", img: CARD_IMAGES.pokemon.rare[1] },
    { name: "Clefairy Holo Base Set", value: 4000, condition: "Near Mint", img: CARD_IMAGES.pokemon.rare[2] },
    { name: "Hitmonchan Holo Base Set", value: 5000, condition: "Near Mint", img: CARD_IMAGES.pokemon.rare[3] },
    { name: "Magneton Holo Base Set", value: 4200, condition: "Excellent", img: CARD_IMAGES.pokemon.rare[4] },
    { name: "Ninetales Holo Base Set", value: 6000, condition: "Near Mint", img: CARD_IMAGES.pokemon.rare[5] },
    { name: "Poliwrath Holo Base Set", value: 3800, condition: "Excellent", img: CARD_IMAGES.pokemon.rare[6] },
  ];

  rareCards.forEach((card, i) => {
    // Create 3 copies of each rare
    for (let copy = 0; copy < 3; copy++) {
      items.push({
        sku: `RAR-${String(i * 3 + copy + 1).padStart(4, "0")}`,
        name: card.name,
        description: `A rare Pokemon holo card in ${card.condition} condition.`,
        images: [card.img],
        tierId: rare.id,
        collection: "Pokemon Base Set",
        condition: card.condition,
        estimatedValue: card.value + Math.floor(Math.random() * 500),
        status: ItemStatus.AVAILABLE,
      });
    }
  });

  // Common items
  const commonCards = [
    { name: "Pikachu Base Set", value: 800, condition: "Good", img: CARD_IMAGES.pokemon.common[0] },
    { name: "Charmander Base Set", value: 1200, condition: "Excellent", img: CARD_IMAGES.pokemon.common[1] },
    { name: "Squirtle Base Set", value: 900, condition: "Good", img: CARD_IMAGES.pokemon.common[2] },
    { name: "Bulbasaur Base Set", value: 1000, condition: "Near Mint", img: CARD_IMAGES.pokemon.common[3] },
    { name: "Drowzee Base Set", value: 300, condition: "Good", img: CARD_IMAGES.pokemon.common[4] },
    { name: "Machop Base Set", value: 350, condition: "Excellent", img: CARD_IMAGES.pokemon.common[5] },
    { name: "Nidoran Base Set", value: 400, condition: "Good", img: CARD_IMAGES.pokemon.common[6] },
    { name: "Ponyta Base Set", value: 450, condition: "Near Mint", img: CARD_IMAGES.pokemon.common[7] },
  ];

  commonCards.forEach((card, i) => {
    // Create 5 copies of each common
    for (let copy = 0; copy < 5; copy++) {
      items.push({
        sku: `COM-${String(i * 5 + copy + 1).padStart(4, "0")}`,
        name: card.name,
        description: `A classic Pokemon card in ${card.condition} condition.`,
        images: [card.img],
        tierId: common.id,
        collection: "Pokemon Base Set",
        condition: card.condition,
        estimatedValue: card.value + Math.floor(Math.random() * 200),
        status: ItemStatus.AVAILABLE,
      });
    }
  });

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
      name: "Pokemon Base Set Mystery Pack",
      description: "Experience the nostalgia! This pack contains one card from the iconic Pokemon Base Set. Every pack is guaranteed to contain at least a Common tier card, with chances at rare holos!",
      images: ["https://images.pokemontcg.io/base1/4/high.png"],
      priceInCents: 1999, // $19.99
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

  // Pack 2: Premium Holo Pack
  const premiumPack = await prisma.packProduct.create({
    data: {
      name: "Premium Holo Chase Pack",
      description: "For the serious collector! This pack guarantees at least a Rare holo card with significantly boosted odds at Epic and Legendary pulls. Can you pull a Charizard?",
      images: ["https://images.pokemontcg.io/base1/10/high.png"],
      priceInCents: 4999, // $49.99
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
      name: "Legendary Grail Pack",
      description: "The ultimate pack! Guaranteed Epic or better with 20% odds at a Legendary pull. This is your best chance at pulling a PSA 10 Charizard!",
      images: ["https://images.pokemontcg.io/base1/2/high.png"],
      priceInCents: 14999, // $149.99
      maxSupply: 20,
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
  // Create Test User with Balance
  // ============================================
  console.log("Creating test user...");

  const userPassword = await bcrypt.hash("test123", 12);
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {
      balanceCents: 50000, // $500 balance for testing
    },
    create: {
      email: "test@example.com",
      passwordHash: userPassword,
      name: "Test User",
      balanceCents: 50000, // $500 balance for testing
    },
  });

  console.log("Created test user: test@example.com / test123 (with $500 balance)");

  // Summary
  console.log("\n✅ Seed completed successfully!");
  console.log("\n📝 Summary:");
  console.log("   - 4 item tiers created");
  console.log(`   - ${items.length} items created`);
  console.log("   - 3 pack products created");
  console.log("   - Admin: admin@courtyard.io / admin123");
  console.log("   - Test User: test@example.com / test123 ($500 balance)");
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
