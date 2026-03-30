-- Add password_hash column to workspaces table for OTP authentication
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "password_hash" text;
