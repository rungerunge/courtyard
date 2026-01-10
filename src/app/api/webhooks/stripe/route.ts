import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { handlePaymentConfirmed, handlePaymentFailed } from "@/lib/assignment-engine";
import { OpeningStatus } from "@prisma/client";
import Stripe from "stripe";

/**
 * Stripe Webhook Handler
 * 
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for payment confirmation
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Processing checkout.session.completed: ${session.id}`);

  // Find the opening by stripe session ID
  const opening = await prisma.packOpening.findFirst({
    where: { stripeSessionId: session.id },
  });

  if (!opening) {
    console.error(`Opening not found for session: ${session.id}`);
    return;
  }

  // Check if already processed (idempotency)
  if (opening.status !== OpeningStatus.PENDING) {
    console.log(`Opening ${opening.id} already processed, skipping`);
    return;
  }

  // Update with payment intent ID
  await prisma.packOpening.update({
    where: { id: opening.id },
    data: {
      stripePaymentId: session.payment_intent as string,
    },
  });

  // Process the payment and assign item
  try {
    const result = await handlePaymentConfirmed(opening.id);
    console.log(`Successfully assigned item ${result.item.id} to opening ${opening.id}`);
  } catch (error) {
    console.error(`Failed to assign item for opening ${opening.id}:`, error);
    
    // Mark as failed - refund should be initiated manually or via separate process
    await prisma.packOpening.update({
      where: { id: opening.id },
      data: { status: OpeningStatus.FAILED },
    });
  }
}

/**
 * Handle expired checkout session
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  console.log(`Processing checkout.session.expired: ${session.id}`);

  const opening = await prisma.packOpening.findFirst({
    where: { stripeSessionId: session.id },
  });

  if (!opening) {
    return;
  }

  // Only update if still pending
  if (opening.status === OpeningStatus.PENDING) {
    await prisma.packOpening.update({
      where: { id: opening.id },
      data: { status: OpeningStatus.FAILED },
    });
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Processing payment_intent.payment_failed: ${paymentIntent.id}`);

  const opening = await prisma.packOpening.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });

  if (!opening) {
    return;
  }

  await handlePaymentFailed(opening.id);
}




