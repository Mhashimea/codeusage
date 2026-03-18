-- Add display_name column to workspaces table
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "display_name" text;
