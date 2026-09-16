import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns the authenticated user (with subscription) for the current request, or null. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });
}

export function isPremium(subscription: { status: string } | null | undefined) {
  return subscription?.status === "active" || subscription?.status === "trialing";
}
