import ReportView from "@/components/ReportView";
import { getAnalysis } from "@/lib/db-helpers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getAnalysis(id);
  if (!row) notFound();
  return <ReportView id={row.id} status={row.status} error={row.error} report={row.report} domain={row.domain} />;
}
