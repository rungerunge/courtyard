import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VaultClient } from "./vault-client";

/**
 * Vault Page
 * 
 * Displays user's owned items from pack openings
 */

async function getVaultHoldings(userId: string) {
  const holdings = await prisma.vaultHolding.findMany({
    where: { userId },
    include: {
      item: {
        include: { tier: true },
      },
      listing: true,
      shipmentRequest: true,
    },
    orderBy: { acquiredAt: "desc" },
  });

  return holdings;
}

async function getOpeningHistory(userId: string) {
  const openings = await prisma.packOpening.findMany({
    where: { userId },
    include: {
      packProduct: true,
      assignment: {
        include: {
          item: {
            include: { tier: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return openings;
}

export default async function VaultPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login?redirect=/vault");
  }

  const [holdings, openings] = await Promise.all([
    getVaultHoldings(session.user.id),
    getOpeningHistory(session.user.id),
  ]);

  // Calculate stats
  const totalItems = holdings.length;
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.item.estimatedValue,
    0
  );
  const listedItems = holdings.filter((h) => h.status === "LISTED").length;
  const shippingItems = holdings.filter(
    (h) => h.status === "SHIPPING"
  ).length;

  return (
    <VaultClient
      holdings={holdings.map((h) => ({
        id: h.id,
        status: h.status,
        acquiredAt: h.acquiredAt.toISOString(),
        item: {
          id: h.item.id,
          name: h.item.name,
          images: h.item.images,
          tierName: h.item.tier.name,
          tierColor: h.item.tier.color,
          estimatedValue: h.item.estimatedValue,
          condition: h.item.condition,
        },
        listing: h.listing ? {
          id: h.listing.id,
          askingPrice: h.listing.askingPrice,
          status: h.listing.status,
        } : null,
        shipmentRequest: h.shipmentRequest ? {
          id: h.shipmentRequest.id,
          status: h.shipmentRequest.status,
          trackingNumber: h.shipmentRequest.trackingNumber,
        } : null,
      }))}
      openings={openings.map((o) => ({
        id: o.id,
        packName: o.packProduct.name,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        item: o.assignment?.item ? {
          name: o.assignment.item.name,
          tierName: o.assignment.item.tier.name,
          tierColor: o.assignment.item.tier.color,
        } : null,
      }))}
      stats={{
        totalItems,
        totalValue,
        listedItems,
        shippingItems,
      }}
    />
  );
}




