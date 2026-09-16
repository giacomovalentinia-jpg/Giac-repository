import { DateTime } from "luxon";

import { prisma } from "@/lib/prisma";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const SERIE_A_CODE = "SA";

export type StandingsRow = {
  position: number;
  teamId: number;
  teamName: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

async function fetchSerieAStandings(): Promise<{ season: string; rows: StandingsRow[] }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY non impostata");

  const res = await fetch(`${FOOTBALL_DATA_BASE}/competitions/${SERIE_A_CODE}/standings`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org ha risposto ${res.status}`);
  }
  const json = await res.json();

  const total = (json.standings as Array<{ type: string; table: unknown[] }> | undefined)?.find(
    (s) => s.type === "TOTAL",
  );
  if (!total) throw new Error("Nessuna classifica TOTAL trovata nella risposta");

  type ApiRow = {
    position: number;
    team: { id: number; name: string; crest?: string | null };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  };

  const rows: StandingsRow[] = (total.table as ApiRow[]).map((row) => ({
    position: row.position,
    teamId: row.team.id,
    teamName: row.team.name,
    crest: row.team.crest ?? null,
    played: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    points: row.points,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
  }));

  const startYear = json.season?.startDate?.slice(0, 4) ?? "";
  const endYearShort = json.season?.endDate?.slice(2, 4) ?? "";
  const season = startYear && endYearShort ? `${startYear}/${endYearShort}` : "N/D";

  return { season, rows };
}

export async function getLatestStandings() {
  return prisma.standingsSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
}

/**
 * Refreshes the Serie A standings snapshot. Meant to run once a day around
 * 23:59 Europe/Rome. Cron schedules can't express "Europe/Rome" directly and
 * the UTC offset shifts twice a year with DST, so rather than trust the exact
 * trigger minute we gate on "it's evening in Rome" and de-duplicate per
 * calendar day here - the caller can schedule a couple of UTC times to cover
 * both offsets and this stays idempotent regardless of which one fires.
 */
export async function updateStandingsSnapshot(options: { force?: boolean } = {}) {
  const nowRome = DateTime.now().setZone("Europe/Rome");
  const dayKey = nowRome.toFormat("yyyy-MM-dd");

  if (!options.force && nowRome.hour < 23) {
    return { skipped: true, reason: "outside-window" as const };
  }

  const existing = await prisma.standingsSnapshot.findUnique({ where: { dayKey } });
  if (existing && !options.force) {
    return { skipped: true, reason: "already-updated" as const };
  }

  const { season, rows } = await fetchSerieAStandings();

  const snapshot = await prisma.standingsSnapshot.upsert({
    where: { dayKey },
    create: { dayKey, season, data: rows, source: "football-data.org" },
    update: { season, data: rows, source: "football-data.org" },
  });

  return { skipped: false as const, snapshot };
}
