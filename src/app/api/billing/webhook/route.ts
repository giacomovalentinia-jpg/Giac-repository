import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function upsertFromStripeSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = sub.metadata?.userId;
  const status = sub.status as
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";

  const data = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status,
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };

  const existing = await prisma.subscription.findFirst({
    where: { OR: [{ stripeCustomerId: customerId }, ...(userId ? [{ userId }] : [])] },
  });

  if (existing) {
    await prisma.subscription.update({ where: { id: existing.id }, data });
    return;
  }

  if (userId) {
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma non valida";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        // Ensure the userId metadata is present for later events even if it
        // wasn't set when the subscription was first created.
        if (!sub.metadata?.userId && session.client_reference_id) {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { userId: session.client_reference_id },
          });
          sub.metadata = { ...sub.metadata, userId: session.client_reference_id };
        }
        await upsertFromStripeSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertFromStripeSubscription(sub);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
