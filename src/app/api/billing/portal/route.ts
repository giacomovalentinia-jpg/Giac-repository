import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "Nessun abbonamento trovato" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
