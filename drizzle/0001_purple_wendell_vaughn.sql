ALTER TABLE "deals" ADD COLUMN "polygon_id" text;--> statement-breakpoint
CREATE INDEX "deals_polygon_idx" ON "deals" USING btree ("polygon_id");