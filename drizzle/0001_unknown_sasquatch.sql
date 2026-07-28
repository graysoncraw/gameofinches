CREATE TABLE `admin_login_attempts` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sleeper_player_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`fetched_date` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sleeper_snapshots` (
	`snapshot_key` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sleeper_sync_runs` (
	`slot_key` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL,
	`error` text DEFAULT '' NOT NULL
);
