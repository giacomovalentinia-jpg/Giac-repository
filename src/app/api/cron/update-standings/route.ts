import { NextRequest, NextResponse } from "next/server";

import { updateStandingsSnapshot } from "@/lib/standings";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "true";

  try {
    const result = await updateStandingsSnapshot({ force });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const POST = GET;
