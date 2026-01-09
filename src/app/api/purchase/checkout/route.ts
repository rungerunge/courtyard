import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPackCheckoutSession } from "@/lib/stripe";
import { canSellPack } from "@/lib/pack-health";
import { PackStatus, OpeningStatus } from "@prisma/client";

/**
 * Checkout API
 * 
 * POST /api/purchase/checkout
 * Creates a Stripe checkout session for pack purchase
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

    // Create pending pack opening record
    const opening = await prisma.packOpening.create({
      data: {
        userId: session.user.id,
        packProductId,
        amountPaid: pack.priceInCents,
        status: OpeningStatus.PENDING,
      },
    });

    // Get app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create Stripe checkout session
    const checkoutSession = await createPackCheckoutSession({
      packProductId,
      packName: pack.name,
      priceInCents: pack.priceInCents,
      userId: session.user.id,
      userEmail: session.user.email!,
      successUrl: `${appUrl}/open/${opening.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/packs/${packProductId}?cancelled=true`,
    });

    // Update opening with Stripe session ID
    await prisma.packOpening.update({
      where: { id: opening.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({
      success: true,
      openingId: opening.id,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

