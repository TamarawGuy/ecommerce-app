-- Trigram search: the GIN index below uses `gin_trgm_ops`, which the pg_trgm
-- extension provides, so it must exist first. (drizzle-kit does not manage
-- extensions, so this line is added by hand.)
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "products_search_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops,"description" gin_trgm_ops);