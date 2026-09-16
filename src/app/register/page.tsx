"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore durante la registrazione");
        return;
      }
      router.push("/login?registered=1");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="hero" style={{ padding: "48px 16px" }}>
        <h1>Crea il tuo account</h1>
      </div>
      <form className="form card" onSubmit={handleSubmit}>
        <label htmlFor="name">Nome (opzionale)</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">Password (min. 8 caratteri)</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span className="error-text">{error}</span>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Creazione account..." : "Registrati"}
        </button>
        <p className="muted">
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </form>
    </div>
  );
}
