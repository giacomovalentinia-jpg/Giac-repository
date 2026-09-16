"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import ChatPanel from "@/components/ChatPanel";
import QuizPanel from "@/components/QuizPanel";
import QuotaBadge from "@/components/QuotaBadge";
import StandingsTable from "@/components/StandingsTable";
import UpgradeButton from "@/components/UpgradeButton";

export default function DashboardClient({
  userLabel,
  initialPremium,
}: {
  userLabel: string;
  initialPremium: boolean;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const bump = () => setRefreshToken((t) => t + 1);

  return (
    <div className="container">
      <div className="header-row">
        <div>
          <h1 style={{ margin: 0 }}>Il Mister</h1>
          <span className="muted">Ciao, {userLabel}</span>
        </div>
        <div className="stack" style={{ flexDirection: "row", alignItems: "center" }}>
          <QuotaBadge refreshToken={refreshToken} />
          <UpgradeButton premium={initialPremium} />
          <button className="btn secondary" onClick={() => signOut({ callbackUrl: "/" })}>
            Esci
          </button>
        </div>
      </div>
      <div className="grid">
        <div className="stack">
          <ChatPanel onQuestionUsed={bump} />
          <QuizPanel onQuestionUsed={bump} />
        </div>
        <div className="stack">
          <StandingsTable />
        </div>
      </div>
    </div>
  );
}
