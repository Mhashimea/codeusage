-- Security hardening migration
-- 1. Add api_key_prefix column to workspaces for O(1) lookup (timing attack prevention)
-- 2. Update verification_tokens to hash OTP codes and track attempts
-- 3. Add rate_limits table for distributed rate limiting

-- Add api_key_prefix to workspaces
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "api_key_prefix" text;
CREATE INDEX IF NOT EXISTS "idx_workspaces_api_key_prefix" ON "workspaces" USING btree ("api_key_prefix");

-- Update verification_tokens table
-- First, drop the old token column and add new columns
ALTER TABLE "verification_tokens" DROP COLUMN IF EXISTS "token";
ALTER TABLE "verification_tokens" ADD COLUMN IF NOT EXISTS "token_hash" text NOT NULL DEFAULT '';
ALTER TABLE "verification_tokens" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;

-- Drop old index and add new ones
DROP INDEX IF EXISTS "idx_verification_tokens_token";
CREATE INDEX IF NOT EXISTS "idx_verification_tokens_expires" ON "verification_tokens" USING btree ("expires_at");

-- Create rate_limits table for distributed rate limiting
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_rate_limits_key" ON "rate_limits" USING btree ("key");
CREATE INDEX IF NOT EXISTS "idx_rate_limits_expires" ON "rate_limits" USING btree ("expires_at");
