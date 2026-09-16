import { NextResponse } from "next/server";

import { getLatestStandings } from "@/lib/standings";

export async function GET() {
  const snapshot = await getLatestStandings();
  if (!snapshot) {
    return NextResponse.json({ season: null, updatedAt: null, rows: [] });
  }

  return NextResponse.json({
    season: snapshot.season,
    updatedAt: snapshot.createdAt,
    rows: snapshot.data,
  });
}
