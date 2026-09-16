import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="hero">
      <h1>⚽ Il Mister</h1>
      <p>
        Chatta con l&apos;IA de Il Mister, mettiti alla prova con i quiz di calcio e segui la
        classifica di Serie A aggiornata ogni giorno.
      </p>
      <div className="stack" style={{ flexDirection: "row", justifyContent: "center" }}>
        <Link href="/register" className="btn">
          Inizia gratis
        </Link>
        <Link href="/login" className="btn secondary">
          Accedi
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 32 }}>
        5 domande gratuite al giorno. Premium a 2,99€/mese per domande illimitate.
      </p>
    </div>
  );
}
