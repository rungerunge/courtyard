import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSellPack } from "@/lib/pack-health";
import { PackStatus, OpeningStatus } from "@prisma/client";
import { assignItemToOpening } from "@/lib/assignment-engine";

/**
 * Checkout API - Test Balance System
 * 
 * POST /api/purchase/checkout
 * Purchases a pack using the user's test balance
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { packProductId } = body;

    if (!packProductId) {
      return NextResponse.json(
        { error: "Pack product ID required" },
        { status: 400 }
      );
    }

    // Get pack product
    const pack = await prisma.packProduct.findUnique({
      where: { id: packProductId },
    });

    if (!pack) {
      return NextResponse.json(
        { error: "Pack not found" },
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

    // Check pack health (can it be sold?)
    const canSell = await canSellPack(packProductId);
    if (!canSell) {
      // Update pack status if needed
      await prisma.packProduct.update({
        where: { id: packProductId },
        data: { status: PackStatus.OUT_OF_STOCK },
      });
      
      return NextResponse.json(
        { error: "This pack is sold out" },
        { status: 400 }
      );
    }

    // Get user's balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balanceCents: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has enough balance
    if (user.balanceCents < pack.priceInCents) {
      return NextResponse.json(
        { 
          error: "Insufficient balance",
          required: pack.priceInCents,
          available: user.balanceCents,
        },
        { status: 400 }
      );
    }

    // Deduct balance and create opening in a transaction
    const opening = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.user.update({
        where: { id: session.user.id },
        data: { 
          balanceCents: { decrement: pack.priceInCents } 
        },
      });

      // Create pack opening record
      const newOpening = await tx.packOpening.create({
        data: {
          userId: session.user.id,
          packProductId,
          amountPaid: pack.priceInCents,
          status: OpeningStatus.PROCESSING,
          paidAt: new Date(),
        },
      });

      return newOpening;
    });

    // Assign item to opening
    try {
      await assignItemToOpening(opening.id);
    } catch (assignError) {
      // Refund balance if assignment fails
      await prisma.user.update({
        where: { id: session.user.id },
        data: { 
          balanceCents: { increment: pack.priceInCents } 
        },
      });
      
      await prisma.packOpening.update({
        where: { id: opening.id },
        data: { status: OpeningStatus.FAILED },
      });

      throw assignError;
    }

    return NextResponse.json({
      success: true,
      openingId: opening.id,
      // No checkout URL - redirect directly to opening page
      redirectUrl: `/open/${opening.id}`,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 }
    );
  }
}
