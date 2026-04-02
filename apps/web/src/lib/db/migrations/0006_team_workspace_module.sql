-- Team & Workspace Module v0.2
-- This migration adds multi-user workspace support with roles and invitations

-- Create enums
DO $$ BEGIN
    CREATE TYPE "member_role" AS ENUM('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" text NOT NULL,
    "name" text,
    "avatar_url" text,
    "current_workspace_id" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index on users email
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");

-- Add owner_id to workspaces if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "workspaces" ADD COLUMN "owner_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create index on workspaces owner_id
CREATE INDEX IF NOT EXISTS "idx_workspaces_owner" ON "workspaces" USING btree ("owner_id");

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" "member_role" DEFAULT 'member' NOT NULL,
    "invited_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "joined_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes on workspace_members
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_members_unique" ON "workspace_members" USING btree ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user" ON "workspace_members" USING btree ("user_id");

-- Create invitations table
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "email" text NOT NULL,
    "role" "member_role" DEFAULT 'member' NOT NULL,
    "token_hash" text NOT NULL,
    "status" "invitation_status" DEFAULT 'pending' NOT NULL,
    "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes on invitations
CREATE INDEX IF NOT EXISTS "idx_invitations_workspace" ON "invitations" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_invitations_email" ON "invitations" USING btree ("email");

-- Remove display_name if it exists (renamed to name in previous version)
DO $$ BEGIN
    ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "display_name";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;
