CREATE TABLE "commissioner_transaction_edits" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"season" text NOT NULL,
	"kind" text NOT NULL,
	"data_json" jsonb NOT NULL,
	"updated_by" text DEFAULT 'Commissioner' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "commissioner_transaction_edits_season_id_idx" ON "commissioner_transaction_edits" USING btree ("season","transaction_id");