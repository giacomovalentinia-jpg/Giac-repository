"use client";

import { useState } from "react";

export default function UpgradeButton({ premium }: { premium: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(premium ? "/api/billing/portal" : "/api/billing/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn" onClick={handleClick} disabled={loading}>
      {loading ? "Attendi..." : premium ? "Gestisci abbonamento" : "Passa a Premium — 2,99€/mese"}
    </button>
  );
}
