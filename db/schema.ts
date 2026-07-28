import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const keepers = sqliteTable(
  "keepers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    season: text("season").notNull(),
    rosterId: integer("roster_id").notNull(),
    slot: integer("slot").notNull(),
    managerName: text("manager_name").notNull(),
    teamName: text("team_name").notNull(),
    playerName: text("player_name").notNull(),
    position: text("position").notNull().default(""),
    nflTeam: text("nfl_team").notNull().default(""),
    costRound: integer("cost_round").notNull(),
    yearsRemaining: integer("years_remaining").notNull(),
    acquisitionType: text("acquisition_type").notNull().default("draft"),
    notes: text("notes").notNull().default(""),
    updatedBy: text("updated_by").notNull().default("sheet-import"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("keepers_season_roster_slot_idx").on(
      table.season,
      table.rosterId,
      table.slot,
    ),
  ],
);

export const sleeperSnapshots = sqliteTable("sleeper_snapshots", {
  snapshotKey: text("snapshot_key").primaryKey(),
  dataJson: text("data_json").notNull(),
  syncedAt: text("synced_at").notNull(),
});

export const sleeperSyncRuns = sqliteTable("sleeper_sync_runs", {
  slotKey: text("slot_key").primaryKey(),
  status: text("status").notNull(),
  updatedAt: text("updated_at").notNull(),
  error: text("error").notNull().default(""),
});

export const sleeperPlayerCache = sqliteTable("sleeper_player_cache", {
  cacheKey: text("cache_key").primaryKey(),
  dataJson: text("data_json").notNull(),
  fetchedDate: text("fetched_date").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminLoginAttempts = sqliteTable("admin_login_attempts", {
  fingerprint: text("fingerprint").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  failures: integer("failures").notNull().default(0),
  blockedUntil: integer("blocked_until").notNull().default(0),
});
