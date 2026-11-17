import {
  bigint,
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const keepers = pgTable(
  "keepers",
  {
    id: serial("id").primaryKey(),
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
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("keepers_season_roster_slot_idx").on(
      table.season,
      table.rosterId,
      table.slot,
    ),
  ],
);

export const sleeperSnapshots = pgTable("sleeper_snapshots", {
  snapshotKey: text("snapshot_key").primaryKey(),
  dataJson: jsonb("data_json").notNull(),
  syncedAt: timestamp("synced_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});

export const sleeperSyncRuns = pgTable("sleeper_sync_runs", {
  slotKey: text("slot_key").primaryKey(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  error: text("error").notNull().default(""),
});

export const sleeperPlayerCache = pgTable("sleeper_player_cache", {
  cacheKey: text("cache_key").primaryKey(),
  dataJson: jsonb("data_json").notNull(),
  fetchedDate: date("fetched_date", { mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});

export const adminLoginAttempts = pgTable("admin_login_attempts", {
  fingerprint: text("fingerprint").primaryKey(),
  windowStartedAt: bigint("window_started_at", { mode: "number" }).notNull(),
  failures: integer("failures").notNull().default(0),
  blockedUntil: bigint("blocked_until", { mode: "number" })
    .notNull()
    .default(0),
});

export const commissionerTransactionEdits = pgTable(
  "commissioner_transaction_edits",
  {
    transactionId: text("transaction_id").primaryKey(),
    season: text("season").notNull(),
    kind: text("kind").notNull(),
    dataJson: jsonb("data_json").notNull(),
    updatedBy: text("updated_by").notNull().default("Commissioner"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("commissioner_transaction_edits_season_id_idx").on(
      table.season,
      table.transactionId,
    ),
  ],
);

export const sleeperWeeklyTeams = pgTable(
  "sleeper_weekly_teams",
  {
    season: text("season").notNull(),
    week: integer("week").notNull(),
    rosterId: integer("roster_id").notNull(),
    userId: text("user_id").notNull(),
    manager: text("manager").notNull(),
    teamName: text("team_name").notNull(),
    matchupId: integer("matchup_id").notNull(),
    opponentRosterId: integer("opponent_roster_id").notNull(),
    opponentId: text("opponent_id").notNull(),
    points: doublePrecision("points").notNull(),
    optimalPoints: doublePrecision("optimal_points").notNull(),
    postseason: boolean("postseason").notNull(),
    result: text("result").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.season, table.week, table.rosterId] }),
  ],
);

export const sleeperWeeklyPlayers = pgTable(
  "sleeper_weekly_players",
  {
    season: text("season").notNull(),
    week: integer("week").notNull(),
    rosterId: integer("roster_id").notNull(),
    userId: text("user_id").notNull(),
    playerId: text("player_id").notNull(),
    playerName: text("player_name").notNull(),
    position: text("position").notNull(),
    nflTeam: text("nfl_team").notNull(),
    points: doublePrecision("points").notNull(),
    starter: boolean("starter").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.season, table.week, table.rosterId, table.playerId],
    }),
    uniqueIndex("sleeper_weekly_players_owner_idx").on(
      table.userId,
      table.season,
      table.week,
      table.playerId,
    ),
    uniqueIndex("sleeper_weekly_players_player_idx").on(
      table.playerId,
      table.season,
      table.week,
      table.rosterId,
    ),
  ],
);
