import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PackStatus } from "@prisma/client";
import { PackDetailClient } from "./pack-detail-client";

/**
 * Pack Detail Page
 * 
 * Shows pack details and purchase option
 */

interface Props {
  params: Promise<{ id: string }>;
}

async function getPack(id: string) {
  const pack = await prisma.packProduct.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          guarantees: {
            include: { tier: true },
          },
          tierWeights: {
            include: { tier: true },
            orderBy: { tier: { displayOrder: "asc" } },
          },
        },
      },
      poolItems: {
        include: {
          item: {
            include: { tier: true },
          },
        },
        take: 12, // Preview items
      },
      _count: {
        select: { poolItems: true },
      },
    },
  });

  return pack;
}

export default async function PackDetailPage({ params }: Props) {
  const { id } = await params;
  const pack = await getPack(id);

  if (!pack) {
    notFound();
  }

  // Calculate tier distribution percentages
  const totalWeight = pack.config?.tierWeights.reduce(
    (sum, tw) => sum + tw.weight,
    0
  ) || 0;

  const tierDistribution = pack.config?.tierWeights.map((tw) => ({
    tierId: tw.tierId,
    tierName: tw.tier.name,
    weight: totalWeight > 0 
      ? Math.round((tw.weight / totalWeight) * 100) 
      : 0,
    color: tw.tier.color,
  })) || [];

  // Get guarantees
  const guarantees = pack.config?.guarantees.map((g) => ({
    tierName: g.tier.name,
    minCount: g.minCount,
    color: g.tier.color,
  })) || [];

  // Sample items for preview
  const previewItems = pack.poolItems.slice(0, 8).map((pi) => ({
    id: pi.item.id,
    name: pi.item.name,
    images: pi.item.images,
    tierName: pi.item.tier.name,
    tierColor: pi.item.tier.color,
    estimatedValue: pi.item.estimatedValue,
  }));

  return (
    <PackDetailClient
      pack={{
        id: pack.id,
        name: pack.name,
        description: pack.description,
        images: pack.images,
        priceInCents: pack.priceInCents,
        maxSupply: pack.maxSupply,
        soldCount: pack.soldCount,
        status: pack.status,
        totalItems: pack._count.poolItems,
      }}
      tierDistribution={tierDistribution}
      guarantees={guarantees}
      previewItems={previewItems}
      isAvailable={pack.status === PackStatus.ACTIVE}
    />
  );
}




