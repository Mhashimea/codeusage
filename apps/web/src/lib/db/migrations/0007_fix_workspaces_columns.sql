-- Fix missing columns in workspaces table

-- Add updated_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "workspaces" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
