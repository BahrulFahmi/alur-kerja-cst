import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config"; // Pastikan ini ada

// Gunakan DATABASE_URL dari .env, atau fallback ke hardcode (untuk testing)
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:segalanyaproses@localhost:5432/cbcst_dev";

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
