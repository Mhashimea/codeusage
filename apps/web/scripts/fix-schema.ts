import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Load from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function run() {
  console.log('Adding missing columns...');

  // Add missing columns to workspaces
  await db.execute(sql`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "display_name" text`);
  await db.execute(sql`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "password_hash" text`);
  await db.execute(sql`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "api_key_prefix" text`);

  // Add missing columns to tasks
  await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "files_created" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "files_modified" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "files_deleted" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "files_changed_details" jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "session_id" text`);

  // Make api_key_hash nullable (users generate manually from settings)
  await db.execute(sql`ALTER TABLE "workspaces" ALTER COLUMN "api_key_hash" DROP NOT NULL`);

  console.log('Columns added successfully');

  // Check table structure
  const result = await client`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
    ORDER BY ordinal_position;
  `;
  console.log('Workspaces table columns:', result);

  // Try the actual query that's failing
  const testQuery = await client`
    SELECT id, name, display_name, password_hash, api_key_hash, api_key_prefix, plan, created_at
    FROM workspaces
    WHERE name = 'test@test.com'
    LIMIT 1
  `;
  console.log('Test query result:', testQuery);

  await client.end();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
