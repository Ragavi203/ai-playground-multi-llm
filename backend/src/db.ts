import { Pool } from "pg";

// Dev-only: allow self-signed certs so Supabase / hosted Postgres work
// without extra CA configuration. Do not use this in production.
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: true
    })
  : null;

export function isDbConfigured(): boolean {
  return !!pool;
}

export async function getPgClient() {
  if (!pool) {
    throw new Error("DATABASE_URL is not set; Postgres is not configured");
  }
  return pool.connect();
}

