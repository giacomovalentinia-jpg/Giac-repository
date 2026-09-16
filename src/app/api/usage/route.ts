import { NextResponse } from "next/server";

import { getRemainingFreeQuestions, FREE_QUESTIONS_PER_DAY } from "@/lib/quota";
import { getCurrentUser, isPremium } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const premium = isPremium(user.subscription);
  const remaining = premium ? null : await getRemainingFreeQuestions(user.id);

  return NextResponse.json({
    premium,
    remaining,
    limit: FREE_QUESTIONS_PER_DAY,
  });
}
