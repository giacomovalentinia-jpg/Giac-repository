/**
 * One-off helper: creates the "Il Mister Premium" product + a recurring
 * 2,99 EUR/month price in Stripe, and prints the price id to put in
 * STRIPE_PRICE_ID. Safe to re-run - it reuses an existing product/price with
 * the same lookup_key instead of duplicating them.
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Imposta STRIPE_SECRET_KEY prima di eseguire questo script.");
  }

  const lookupKey = "il-mister-premium-monthly";

  const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existingPrices.data[0]) {
    console.log(`Prezzo già esistente: ${existingPrices.data[0].id}`);
    console.log(`Imposta STRIPE_PRICE_ID=${existingPrices.data[0].id}`);
    return;
  }

  const product = await stripe.products.create({
    name: "Il Mister Premium",
    description: "Domande illimitate a Il Mister e quiz senza limiti giornalieri.",
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: 299,
    recurring: { interval: "month" },
    lookup_key: lookupKey,
  });

  console.log(`Prodotto creato: ${product.id}`);
  console.log(`Prezzo creato: ${price.id}`);
  console.log(`Imposta STRIPE_PRICE_ID=${price.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
