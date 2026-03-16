import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections in development (hot reload)
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const conn = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });

// Re-export schema for convenience
export * from "./schema";
