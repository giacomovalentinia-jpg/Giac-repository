"use client";

import { useEffect, useState } from "react";

type Usage = { premium: boolean; remaining: number | null; limit: number };

export default function QuotaBadge({ refreshToken }: { refreshToken: number }) {
  const [data, setData] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  if (!data) return null;

  if (data.premium) {
    return <span className="badge premium">⭐ Premium</span>;
  }

  return (
    <span className="badge">
      {data.remaining}/{data.limit} domande gratuite oggi
    </span>
  );
}
