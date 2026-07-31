import { db, isDbConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  if (isDbConfigured) {
    try {
      await db.execute(sql`select 1`);
      database = true;
    } catch {
      database = false;
    }
  }
  // The app is healthy even without a database (DB is optional for operation);
  // we surface DB connectivity as a field rather than failing the liveness probe.
  return Response.json({ ok: true, database, dbConfigured: isDbConfigured });
}
