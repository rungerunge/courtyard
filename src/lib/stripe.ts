import Stripe from "stripe";

/**
 * Stripe Client
 * 
 * Handles payment processing for pack purchases
 */

// Use a placeholder key during build to prevent crashes
// Real key is required at runtime
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

if (!process.env.STRIPE_SECRET_KEY && typeof window === "undefined" && process.env.NODE_ENV === "production") {
  console.warn("STRIPE_SECRET_KEY not configured");
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

/**
 * Create a Checkout Session for pack purchase
 */
export async function createPackCheckoutSession({
  packProductId,
  packName,
  priceInCents,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  packProductId: string;
  packName: string;
  priceInCents: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      packProductId,
      userId,
      type: "pack_purchase",
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: packName,
            description: "Mystery pack - Item revealed after purchase",
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Create refund for a payment
 */
export async function createRefund(
  paymentIntentId: string,
  reason?: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
    metadata: {
      reason: reason || "Pack opening failed",
    },
  });
}

export default stripe;




