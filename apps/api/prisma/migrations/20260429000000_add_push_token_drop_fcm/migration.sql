-- ─── PushToken table (Expo Push, multi-device per user) ────────────────────
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique on token (one row per device).
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- Per-user lookup (sendToUser fetches all tokens for a userId).
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- Backfill: any existing User.fcm_token becomes a PushToken row with
-- platform 'unknown'. Client re-register on next login will correct the
-- platform via UPSERT (Spec scenario "Platform corrected on next register").
-- gen_random_uuid() requires pgcrypto (default in Postgres 13+).
INSERT INTO "push_tokens" ("id", "user_id", "token", "platform", "created_at", "last_used_at")
SELECT gen_random_uuid()::text, "id", "fcm_token", 'unknown', NOW(), NOW()
FROM "users"
WHERE "fcm_token" IS NOT NULL;

-- Drop the legacy single-token column.
ALTER TABLE "users" DROP COLUMN "fcm_token";

-- FK constraint last (after backfill so no FK churn during INSERT-SELECT).
ALTER TABLE "push_tokens"
  ADD CONSTRAINT "push_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
