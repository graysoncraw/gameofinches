CREATE TABLE `sleeper_weekly_players` (
	`season` text NOT NULL,
	`week` integer NOT NULL,
	`roster_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`position` text NOT NULL,
	`nfl_team` text NOT NULL,
	`points` real NOT NULL,
	`starter` integer NOT NULL,
	PRIMARY KEY(`season`, `week`, `roster_id`, `player_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sleeper_weekly_players_owner_idx` ON `sleeper_weekly_players` (`user_id`,`season`,`week`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sleeper_weekly_players_player_idx` ON `sleeper_weekly_players` (`player_id`,`season`,`week`,`roster_id`);--> statement-breakpoint
CREATE TABLE `sleeper_weekly_teams` (
	`season` text NOT NULL,
	`week` integer NOT NULL,
	`roster_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`manager` text NOT NULL,
	`team_name` text NOT NULL,
	`matchup_id` integer NOT NULL,
	`opponent_roster_id` integer NOT NULL,
	`opponent_id` text NOT NULL,
	`points` real NOT NULL,
	`optimal_points` real NOT NULL,
	`postseason` integer NOT NULL,
	`result` text NOT NULL,
	PRIMARY KEY(`season`, `week`, `roster_id`)
);
