CREATE TABLE "ai_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
