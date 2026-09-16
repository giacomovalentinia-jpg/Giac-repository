import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Il Mister] STRIPE_SECRET_KEY non impostata: la fatturazione non funzionerà.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

export const PREMIUM_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
