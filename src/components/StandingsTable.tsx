"use client";

import { useEffect, useState } from "react";

type Row = {
  position: number;
  teamName: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
};

type StandingsResponse = { season: string | null; updatedAt: string | null; rows: Row[] };

export default function StandingsTable() {
  const [data, setData] = useState<StandingsResponse | null>(null);

  useEffect(() => {
    fetch("/api/standings")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="card">Caricamento classifica...</div>;

  if (!data.rows.length) {
    return (
      <div className="card">
        <h2>Classifica Serie A</h2>
        <p className="muted">
          Nessun dato disponibile ancora. Torna dopo l&apos;aggiornamento giornaliero delle 23:59.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Classifica Serie A {data.season}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Squadra</th>
            <th>PG</th>
            <th>V</th>
            <th>N</th>
            <th>P</th>
            <th>DR</th>
            <th>Pt</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.position}>
              <td>{r.position}</td>
              <td>{r.teamName}</td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              <td>{r.draw}</td>
              <td>{r.lost}</td>
              <td>{r.goalDifference}</td>
              <td>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.updatedAt && (
        <p className="muted">Aggiornato il {new Date(data.updatedAt).toLocaleString("it-IT")}</p>
      )}
    </div>
  );
}
