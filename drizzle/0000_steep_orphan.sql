CREATE TABLE `keepers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season` text NOT NULL,
	`roster_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`manager_name` text NOT NULL,
	`team_name` text NOT NULL,
	`player_name` text NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`nfl_team` text DEFAULT '' NOT NULL,
	`cost_round` integer NOT NULL,
	`years_remaining` integer NOT NULL,
	`acquisition_type` text DEFAULT 'draft' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_by` text DEFAULT 'sheet-import' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keepers_season_roster_slot_idx` ON `keepers` (`season`,`roster_id`,`slot`);