CREATE TABLE "admin_login_attempts" (
	"fingerprint" text PRIMARY KEY NOT NULL,
	"window_started_at" bigint NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"blocked_until" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keepers" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" text NOT NULL,
	"roster_id" integer NOT NULL,
	"slot" integer NOT NULL,
	"manager_name" text NOT NULL,
	"team_name" text NOT NULL,
	"player_name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"nfl_team" text DEFAULT '' NOT NULL,
	"cost_round" integer NOT NULL,
	"years_remaining" integer NOT NULL,
	"acquisition_type" text DEFAULT 'draft' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_by" text DEFAULT 'sheet-import' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleeper_player_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"data_json" jsonb NOT NULL,
	"fetched_date" date NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleeper_snapshots" (
	"snapshot_key" text PRIMARY KEY NOT NULL,
	"data_json" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleeper_sync_runs" (
	"slot_key" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"error" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleeper_weekly_players" (
	"season" text NOT NULL,
	"week" integer NOT NULL,
	"roster_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"position" text NOT NULL,
	"nfl_team" text NOT NULL,
	"points" double precision NOT NULL,
	"starter" boolean NOT NULL,
	CONSTRAINT "sleeper_weekly_players_season_week_roster_id_player_id_pk" PRIMARY KEY("season","week","roster_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "sleeper_weekly_teams" (
	"season" text NOT NULL,
	"week" integer NOT NULL,
	"roster_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"manager" text NOT NULL,
	"team_name" text NOT NULL,
	"matchup_id" integer NOT NULL,
	"opponent_roster_id" integer NOT NULL,
	"opponent_id" text NOT NULL,
	"points" double precision NOT NULL,
	"optimal_points" double precision NOT NULL,
	"postseason" boolean NOT NULL,
	"result" text NOT NULL,
	CONSTRAINT "sleeper_weekly_teams_season_week_roster_id_pk" PRIMARY KEY("season","week","roster_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "keepers_season_roster_slot_idx" ON "keepers" USING btree ("season","roster_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "sleeper_weekly_players_owner_idx" ON "sleeper_weekly_players" USING btree ("user_id","season","week","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sleeper_weekly_players_player_idx" ON "sleeper_weekly_players" USING btree ("player_id","season","week","roster_id");