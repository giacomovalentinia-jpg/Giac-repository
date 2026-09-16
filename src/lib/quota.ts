import { DateTime } from "luxon";

import { prisma } from "@/lib/prisma";

export const FREE_QUESTIONS_PER_DAY = 5;

function todayKeyRome(): string {
  return DateTime.now().setZone("Europe/Rome").toFormat("yyyy-MM-dd");
}

/**
 * Atomically consumes one free question for a non-premium user, keyed by the
 * current Europe/Rome calendar day. The increment happens unconditionally
 * inside the upsert (a single row-level write, safe under concurrency), then
 * we roll it back if it pushed the count past the daily limit - this avoids
 * a check-then-write race between concurrent requests from the same user.
 */
export async function consumeFreeQuestion(
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const date = todayKeyRome();

  const updated = await prisma.usageLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (updated.count > FREE_QUESTIONS_PER_DAY) {
    await prisma.usageLog.update({
      where: { userId_date: { userId, date } },
      data: { count: { decrement: 1 } },
    });
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: FREE_QUESTIONS_PER_DAY - updated.count };
}

export async function getRemainingFreeQuestions(userId: string): Promise<number> {
  const date = todayKeyRome();
  const log = await prisma.usageLog.findUnique({
    where: { userId_date: { userId, date } },
  });
  return Math.max(0, FREE_QUESTIONS_PER_DAY - (log?.count ?? 0));
}
