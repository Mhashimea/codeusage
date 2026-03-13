import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DbInstance = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

let dbInstance: DbInstance | null = null;

function isNeonUrl(url: string): boolean {
  return url.includes(".neon.tech") || url.includes("neondb");
}

export function getDb(): DbInstance {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const url = process.env.DATABASE_URL;

    if (isNeonUrl(url)) {
      // Use Neon serverless driver for Neon databases
      const sql = neon(url);
      dbInstance = drizzleNeon(sql, { schema });
    } else {
      // Use standard pg driver for local PostgreSQL
      const pool = new Pool({ connectionString: url });
      dbInstance = drizzleNode(pool, { schema });
    }
  }
  return dbInstance;
}

// For convenience, export a proxy that lazily initializes
export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema";
