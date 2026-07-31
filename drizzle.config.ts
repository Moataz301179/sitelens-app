import { defineConfig } from "drizzle-kit";

// Reads DATABASE_URL from the environment so `npm run db:push` targets the real
// database (local dev, VPS Postgres, Supabase, Neon, etc.). Falls back to a
// localhost placeholder only if the var is unset.
const url =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
