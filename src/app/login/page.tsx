"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | "magic" | null>(null);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("password");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    setLoading(null);
    if (res?.error) {
      setError("Email o password non corrette.");
    } else if (res?.url) {
      window.location.href = res.url;
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("magic");
    await signIn("email", { email, redirect: false, callbackUrl: "/dashboard" });
    setLoading(null);
    window.location.href = "/verify-request";
  }

  return (
    <div className="container">
      <div className="hero" style={{ padding: "48px 16px" }}>
        <h1>Accedi</h1>
      </div>
      <form className="form card" onSubmit={handlePasswordLogin}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span className="error-text">{error}</span>}
        <button type="submit" className="btn" disabled={loading !== null}>
          {loading === "password" ? "Accesso in corso..." : "Accedi con password"}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={loading !== null || !email}
          onClick={handleMagicLink}
        >
          {loading === "magic" ? "Invio link..." : "Invia magic link via email"}
        </button>
        <p className="muted">
          Non hai un account? <Link href="/register">Registrati</Link>
        </p>
      </form>
    </div>
  );
}
