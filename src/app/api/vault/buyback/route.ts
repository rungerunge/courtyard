import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HoldingStatus, ItemStatus } from "@prisma/client";

/**
 * Instant Buyback API
 * 
 * POST /api/vault/buyback
 * 
 * Sells an item back instantly for 90% of its estimated value
 */

const BUYBACK_RATE = 0.90; // 90% of item value

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { holdingId } = body;

    if (!holdingId) {
      return NextResponse.json(
        { error: "Holding ID required" },
        { status: 400 }
      );
    }

    // Get the holding with item details
    const holding = await prisma.vaultHolding.findFirst({
      where: {
        id: holdingId,
        userId: session.user.id,
        status: HoldingStatus.HOLDING,
      },
      include: {
        item: true,
      },
    });

    if (!holding) {
      return NextResponse.json(
        { error: "Holding not found or not available for buyback" },
        { status: 404 }
      );
    }

    // Calculate buyback amount (90% of estimated value)
    const buybackAmount = Math.floor(holding.item.estimatedValue * BUYBACK_RATE);

    // Execute buyback in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update holding status to SOLD
      await tx.vaultHolding.update({
        where: { id: holdingId },
        data: { status: HoldingStatus.SOLD },
      });

      // Update item status back to AVAILABLE for resale
      await tx.item.update({
        where: { id: holding.item.id },
        data: { status: ItemStatus.AVAILABLE },
      });

      // Credit user's balance
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          balanceCents: { increment: buybackAmount },
        },
        select: { balanceCents: true },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "BUYBACK",
          entityType: "VaultHolding",
          entityId: holdingId,
          details: {
            itemId: holding.item.id,
            itemName: holding.item.name,
            estimatedValue: holding.item.estimatedValue,
            buybackRate: BUYBACK_RATE,
            buybackAmount,
            userId: session.user.id,
          },
        },
      });

      return {
        buybackAmount,
        newBalance: updatedUser.balanceCents,
      };
    });

    return NextResponse.json({
      success: true,
      itemName: holding.item.name,
      estimatedValue: holding.item.estimatedValue,
      buybackRate: BUYBACK_RATE,
      buybackAmount: result.buybackAmount,
      newBalance: result.newBalance,
      message: `Sold ${holding.item.name} for $${(result.buybackAmount / 100).toFixed(2)} (90% of value)`,
    });
  } catch (error) {
    console.error("Buyback error:", error);
    return NextResponse.json(
      { error: "Failed to process buyback" },
      { status: 500 }
    );
  }
}

