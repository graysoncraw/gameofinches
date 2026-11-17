import type { PostgresDatabase } from "../../../db";
import type { PlayerLabel } from "./types";
import { sleeperFetch } from "./client.ts";
import { chicagoDate } from "./schedule.ts";

let memoryPlayers: {
  date: string;
  players: Record<string, PlayerLabel>;
} | null = null;

export async function loadPlayers(db: PostgresDatabase | null) {
  const today = chicagoDate();
  if (!db && memoryPlayers?.date === today) return memoryPlayers.players;
  if (db) {
    const cached = await db
      .prepare(
        `SELECT data_json, fetched_date::text AS fetched_date
         FROM sleeper_player_cache
         WHERE cache_key = 'nfl'`,
      )
      .first<{
        data_json: Record<string, PlayerLabel> | string;
        fetched_date: string;
      }>();
    if (cached?.fetched_date === today) {
      return (
        typeof cached.data_json === "string"
          ? JSON.parse(cached.data_json)
          : cached.data_json
      ) as Record<string, PlayerLabel>;
    }
  }

  const raw = await sleeperFetch<Record<string, PlayerLabel>>("/players/nfl");
  const players = Object.fromEntries(
    Object.entries(raw).map(([id, player]) => [
      id,
      {
        full_name: player.full_name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        team: player.team,
      },
    ]),
  );

  if (db) {
    await db
      .prepare(
        `INSERT INTO sleeper_player_cache
         (cache_key, data_json, fetched_date, updated_at)
         VALUES ('nfl', ?::jsonb, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           data_json = excluded.data_json,
           fetched_date = excluded.fetched_date,
           updated_at = excluded.updated_at`,
      )
      .bind(JSON.stringify(players), today, new Date().toISOString())
      .run();
  }
  if (!db) memoryPlayers = { date: today, players };
  return players;
}

export function playerLabel(
  playerId: string,
  players: Record<string, PlayerLabel>,
) {
  const player = players[playerId];
  return {
    id: playerId,
    name:
      player?.full_name ||
      [player?.first_name, player?.last_name].filter(Boolean).join(" ") ||
      playerId,
    position: player?.position ?? (playerId.length <= 3 ? "DEF" : ""),
    nflTeam: player?.team ?? (playerId.length <= 3 ? playerId : ""),
  };
}
