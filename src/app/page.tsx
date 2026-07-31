import HomeClient from "@/components/HomeClient";
import { listAnalyses } from "@/lib/db-helpers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recent = await listAnalyses(10);
  return <HomeClient initialRecent={recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
