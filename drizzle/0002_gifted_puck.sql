CREATE TABLE "geo_cache" (
	"addr" text PRIMARY KEY NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"polygon_id" text,
	"gush" integer,
	"helka" integer,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
