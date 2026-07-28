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
