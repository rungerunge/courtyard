import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSellPack } from "@/lib/pack-health";
import { assignItemToOpening } from "@/lib/assignment-engine";
import { PackStatus, OpeningStatus } from "@prisma/client";

/**
 * Checkout API
 * 
 * POST /api/purchase/checkout
 * Handles pack purchase using internal balance
 * Supports opening 1-3 packs at once
 */

const MAX_QUANTITY = 3;

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
    const { packProductId, quantity = 1 } = body;

    if (!packProductId) {
      return NextResponse.json(
        { error: "Pack product ID required" },
        { status: 400 }
      );
    }

    // Validate quantity (1-3)
    const qty = Math.min(Math.max(1, Math.floor(quantity)), MAX_QUANTITY);

    // Get pack product and user
    const [pack, user] = await Promise.all([
      prisma.packProduct.findUnique({
        where: { id: packProductId },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, balanceCents: true },
      }),
    ]);

    if (!pack) {
      return NextResponse.json(
        { error: "Pack not found" },
        { status: 404 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check pack status
    if (pack.status !== PackStatus.ACTIVE) {
      return NextResponse.json(
        { error: "This pack is not available for purchase" },
        { status: 400 }
      );
    }

    // Calculate total cost
    const totalCost = pack.priceInCents * qty;

    // Check user balance
    if (user.balanceCents < totalCost) {
      return NextResponse.json(
        { error: `Insufficient balance. Need $${(totalCost / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    // Check pack health for all requested packs
    for (let i = 0; i < qty; i++) {
      const canSell = await canSellPack(packProductId);
      if (!canSell) {
        await prisma.packProduct.update({
          where: { id: packProductId },
          data: { status: PackStatus.OUT_OF_STOCK },
        });
        
        return NextResponse.json(
          { error: i === 0 ? "This pack is sold out" : `Only ${i} packs available` },
          { status: 400 }
        );
      }
    }

    // Create openings and assign items
    const openings = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.user.update({
        where: { id: user.id },
        data: { balanceCents: { decrement: totalCost } },
      });

      // Create pack opening records
      const createdOpenings = [];
      for (let i = 0; i < qty; i++) {
        const opening = await tx.packOpening.create({
          data: {
            userId: session.user.id,
            packProductId,
            amountPaid: pack.priceInCents,
            status: OpeningStatus.PROCESSING,
          },
        });
        createdOpenings.push(opening);
      }

      return createdOpenings;
    });

    // Assign items to each opening (outside transaction for lock handling)
    const results = [];
    for (const opening of openings) {
      try {
        const result = await assignItemToOpening(opening.id);
        results.push({
          openingId: opening.id,
          success: true,
          item: {
            id: result.item.id,
            name: result.item.name,
            tierName: result.tier.name,
            estimatedValue: result.estimatedValue,
          },
        });
      } catch (error) {
        console.error(`Failed to assign item to opening ${opening.id}:`, error);
        results.push({
          openingId: opening.id,
          success: false,
          error: "Assignment failed",
        });
      }
    }

    // If single pack, redirect to opening page
    if (qty === 1) {
      return NextResponse.json({
        success: true,
        openingId: openings[0].id,
        quantity: 1,
        totalCost,
      });
    }

    // For multiple packs, return all results
    return NextResponse.json({
      success: true,
      quantity: qty,
      totalCost,
      openings: results,
      redirectUrl: `/open/multi?ids=${openings.map(o => o.id).join(",")}`,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 }
    );
  }
}
