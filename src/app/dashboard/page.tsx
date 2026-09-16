import { redirect } from "next/navigation";

import DashboardClient from "@/components/DashboardClient";
import { getCurrentUser, isPremium } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardClient
      userLabel={user.name ?? user.email}
      initialPremium={isPremium(user.subscription)}
    />
  );
}
