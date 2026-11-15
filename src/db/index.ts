import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Membaca DATABASE_URL dari .env.local (lokal) atau Vercel Environment Variables
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diset di Environment Variables");
}

// WAJIB: prepare: false untuk Supabase Pooler (Vercel)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
