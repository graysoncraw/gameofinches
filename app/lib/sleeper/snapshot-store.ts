import type { PostgresDatabase } from "../../../db";
import type { LeagueData, TransactionFeed } from "../league-types";
import type { WeeklyTeamFact, WeeklyPlayerFact } from "../chaos";

const SNAPSHOT_KEY = "game-of-inches";
const SYNC_RETRY_MS = 15 * 60 * 1000;

export type LeagueSnapshot = {
  schemaVersion: number;
  data: LeagueData;
  transactions: Record<string, TransactionFeed>;
  facts: {
    teams: WeeklyTeamFact[];
    players: WeeklyPlayerFact[];
    rosters?: WeeklyPlayerFact[];
  };
};

function storedJson<T>(value: string | T): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

export async function readSnapshot(
  db: PostgresDatabase,
): Promise<LeagueSnapshot | null> {
  const row = await db
    .prepare("SELECT data_json FROM sleeper_snapshots WHERE snapshot_key = ?")
    .bind(SNAPSHOT_KEY)
    .first<{ data_json: LeagueSnapshot | string }>();
  return row ? storedJson<LeagueSnapshot>(row.data_json) : null;
}

export async function waitForInitialSnapshot(db: PostgresDatabase) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const snapshot = await readSnapshot(db);
    if (snapshot) return snapshot;
  }
  return null;
}

export async function claimSync(db: PostgresDatabase, slot: string) {
  const now = new Date().toISOString();
  const inserted = await db
    .prepare(
      `INSERT INTO sleeper_sync_runs
       (slot_key, status, updated_at, error) VALUES (?, 'running', ?, '')
       ON CONFLICT (slot_key) DO NOTHING`,
    )
    .bind(slot, now)
    .run();
  if ((inserted.meta.changes ?? 0) > 0) return true;

  const retryBefore = new Date(Date.now() - SYNC_RETRY_MS).toISOString();
  const retried = await db
    .prepare(
      `UPDATE sleeper_sync_runs
       SET status = 'running', updated_at = ?, error = ''
       WHERE slot_key = ? AND status IN ('failed', 'running') AND updated_at <= ?`,
    )
    .bind(now, slot, retryBefore)
    .run();
  return (retried.meta.changes ?? 0) > 0;
}

export async function finishSync(
  db: PostgresDatabase,
  slot: string,
  status: "success" | "failed",
  error = "",
) {
  await db
    .prepare(
      `UPDATE sleeper_sync_runs
       SET status = ?, updated_at = ?, error = ? WHERE slot_key = ?`,
    )
    .bind(status, new Date().toISOString(), error.slice(0, 500), slot)
    .run();
}

function factStatements(
  db: PostgresDatabase,
  facts: LeagueSnapshot["facts"],
  seasons: string[],
) {
  const deletes = seasons.flatMap((season) => [
    db
      .prepare("DELETE FROM sleeper_weekly_teams WHERE season = ?")
      .bind(season),
    db
      .prepare("DELETE FROM sleeper_weekly_players WHERE season = ?")
      .bind(season),
  ]);

  const teamStatements = facts.teams
    .filter((fact) => seasons.includes(fact.season))
    .map((fact) =>
      db
        .prepare(
          `INSERT INTO sleeper_weekly_teams (
            season, week, roster_id, user_id, manager, team_name, matchup_id,
            opponent_roster_id, opponent_id, points, optimal_points,
            postseason, result
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          fact.season,
          fact.week,
          fact.rosterId,
          fact.userId,
          fact.manager,
          fact.teamName,
          fact.matchupId,
          fact.opponentRosterId,
          fact.opponentId,
          fact.points,
          fact.optimalPoints,
          fact.postseason,
          fact.result,
        ),
    );
  const playerStatements = facts.players
    .filter((fact) => seasons.includes(fact.season))
    .map((fact) =>
      db
        .prepare(
          `INSERT INTO sleeper_weekly_players (
            season, week, roster_id, user_id, player_id, player_name,
            position, nfl_team, points, starter
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          fact.season,
          fact.week,
          fact.rosterId,
          fact.userId,
          fact.playerId,
          fact.playerName,
          fact.position,
          fact.nflTeam,
          fact.points,
          fact.starter,
        ),
    );
  return [...deletes, ...teamStatements, ...playerStatements];
}

export async function saveSnapshot(
  db: PostgresDatabase,
  snapshot: LeagueSnapshot,
  seasons: string[],
) {
  const snapshotWrite = db
    .prepare(
      `INSERT INTO sleeper_snapshots (snapshot_key, data_json, synced_at)
       VALUES (?, ?::jsonb, ?)
       ON CONFLICT(snapshot_key) DO UPDATE SET
         data_json = excluded.data_json,
         synced_at = excluded.synced_at`,
    )
    .bind(SNAPSHOT_KEY, JSON.stringify(snapshot), snapshot.data.fetchedAt);
  await db.batch([
    ...factStatements(db, snapshot.facts, seasons),
    snapshotWrite,
  ]);
}
