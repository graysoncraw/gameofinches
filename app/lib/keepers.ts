import { getDatabase, type PostgresDatabase } from "../../db";
import { FIRST_ROUND_CONFLICT_MESSAGE } from "./keeper-rules";
import { HISTORICAL_KEEPERS, type KeeperSeed } from "./keeper-seed";

export type KeeperRecord = KeeperSeed & {
  id?: number;
  updatedBy?: string;
  updatedAt?: string;
};

export type KeeperWrite = Omit<KeeperSeed, "notes"> & {
  notes?: string;
};

let keeperSeedPromise: Promise<void> | null = null;

async function ensureKeeperSeed(db: PostgresDatabase) {
  if (keeperSeedPromise) return keeperSeedPromise;
  const now = new Date().toISOString();
  keeperSeedPromise = db
    .batch(
      HISTORICAL_KEEPERS.map((keeper) =>
        db
          .prepare(
            `INSERT INTO keepers (
              season, roster_id, slot, manager_name, team_name, player_name,
              position, nfl_team, cost_round, years_remaining, acquisition_type,
              notes, updated_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (season, roster_id, slot) DO NOTHING`,
          )
          .bind(
            keeper.season,
            keeper.rosterId,
            keeper.slot,
            keeper.managerName,
            keeper.teamName,
            keeper.playerName,
            keeper.position,
            keeper.nflTeam,
            keeper.costRound,
            keeper.yearsRemaining,
            keeper.acquisitionType,
            keeper.notes,
            "sheet-import",
            now,
          ),
      ),
    )
    .then(() => undefined)
    .catch((error) => {
      keeperSeedPromise = null;
      throw error;
    });
  return keeperSeedPromise;
}

function mapRow(row: Record<string, unknown>): KeeperRecord {
  return {
    id: Number(row.id),
    season: String(row.season),
    rosterId: Number(row.roster_id),
    slot: Number(row.slot),
    managerName: String(row.manager_name),
    teamName: String(row.team_name),
    playerName: String(row.player_name),
    position: String(row.position ?? ""),
    nflTeam: String(row.nfl_team ?? ""),
    costRound: Number(row.cost_round),
    yearsRemaining: Number(row.years_remaining),
    acquisitionType: String(
      row.acquisition_type ?? "draft",
    ) as KeeperRecord["acquisitionType"],
    notes: String(row.notes ?? ""),
    updatedBy: String(row.updated_by ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getKeeperRecords(): Promise<KeeperRecord[]> {
  const db = getDatabase();
  if (!db) return HISTORICAL_KEEPERS;

  await ensureKeeperSeed(db);
  const results = await db
    .prepare(
      `SELECT * FROM keepers
       ORDER BY season DESC, roster_id ASC, slot ASC`,
    )
    .all<Record<string, unknown>>();

  return (results.results ?? []).map(mapRow);
}

export async function saveKeeper(
  keeper: KeeperWrite,
  updatedBy: string,
): Promise<KeeperRecord> {
  const db = getDatabase();
  if (!db) throw new Error("Keeper storage is unavailable.");
  await ensureKeeperSeed(db);

  if (keeper.costRound === 1) {
    const conflict = await db
      .prepare(
        `SELECT id FROM keepers
         WHERE season = ? AND roster_id = ? AND slot != ? AND cost_round = 1
         LIMIT 1`,
      )
      .bind(keeper.season, keeper.rosterId, keeper.slot)
      .first();
    if (conflict) throw new Error(FIRST_ROUND_CONFLICT_MESSAGE);
  }

  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO keepers (
        season, roster_id, slot, manager_name, team_name, player_name,
        position, nfl_team, cost_round, years_remaining, acquisition_type,
        notes, updated_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(season, roster_id, slot) DO UPDATE SET
        manager_name = excluded.manager_name,
        team_name = excluded.team_name,
        player_name = excluded.player_name,
        position = excluded.position,
        nfl_team = excluded.nfl_team,
        cost_round = excluded.cost_round,
        years_remaining = excluded.years_remaining,
        acquisition_type = excluded.acquisition_type,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at`,
    )
    .bind(
      keeper.season,
      keeper.rosterId,
      keeper.slot,
      keeper.managerName,
      keeper.teamName,
      keeper.playerName,
      keeper.position,
      keeper.nflTeam,
      keeper.costRound,
      keeper.yearsRemaining,
      keeper.acquisitionType,
      keeper.notes ?? "",
      updatedBy,
      updatedAt,
    )
    .run();

  const saved = await db
    .prepare(
      "SELECT * FROM keepers WHERE season = ? AND roster_id = ? AND slot = ?",
    )
    .bind(keeper.season, keeper.rosterId, keeper.slot)
    .first<Record<string, unknown>>();

  if (!saved) throw new Error("The keeper could not be read after saving.");
  return mapRow(saved);
}

export async function deleteKeeper(
  season: string,
  rosterId: number,
  slot: number,
) {
  const db = getDatabase();
  if (!db) throw new Error("Keeper storage is unavailable.");
  await ensureKeeperSeed(db);
  await db
    .prepare(
      "DELETE FROM keepers WHERE season = ? AND roster_id = ? AND slot = ?",
    )
    .bind(season, rosterId, slot)
    .run();
}
