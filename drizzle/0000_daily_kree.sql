CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"gush" integer NOT NULL,
	"helka" integer,
	"address" text,
	"deal_date" timestamp,
	"amount" integer,
	"area" real,
	"rooms" real,
	"floor" integer,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gush_sync" (
	"gush" integer PRIMARY KEY NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "deals_gush_idx" ON "deals" USING btree ("gush");