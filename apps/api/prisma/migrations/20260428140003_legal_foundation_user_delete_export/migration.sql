-- ─── User: legal acceptance + soft-delete columns ──────────────────────────
-- Add columns nullable first so backfill can run, then enforce NOT NULL on
-- the acceptance fields (deleted_at stays nullable by design).
ALTER TABLE "users"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "accepted_tos_version" VARCHAR(10),
  ADD COLUMN "accepted_privacy_version" VARCHAR(10),
  ADD COLUMN "accepted_at" TIMESTAMP(3);

-- Backfill existing users: grandfather as v0 + acceptedAt = createdAt.
-- This MUST run before the NOT NULL constraints below, otherwise any
-- pre-existing row would violate them.
UPDATE "users"
SET "accepted_tos_version" = 'v0',
    "accepted_privacy_version" = 'v0',
    "accepted_at" = "created_at"
WHERE "accepted_tos_version" IS NULL;

-- Now enforce NOT NULL + defaults for new rows.
ALTER TABLE "users"
  ALTER COLUMN "accepted_tos_version" SET NOT NULL,
  ALTER COLUMN "accepted_tos_version" SET DEFAULT 'v0',
  ALTER COLUMN "accepted_privacy_version" SET NOT NULL,
  ALTER COLUMN "accepted_privacy_version" SET DEFAULT 'v0',
  ALTER COLUMN "accepted_at" SET NOT NULL,
  ALTER COLUMN "accepted_at" SET DEFAULT CURRENT_TIMESTAMP;

-- Index for cron query (`WHERE deleted_at < cutoff`).
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- ─── ExportStatus enum + DataExportRequest table ───────────────────────────
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'READY', 'DOWNLOADED', 'EXPIRED', 'FAILED');

CREATE TABLE "data_export_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "file_path" TEXT,
    "downloaded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "data_export_requests_user_id_created_at_idx" ON "data_export_requests"("user_id", "created_at");

ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
