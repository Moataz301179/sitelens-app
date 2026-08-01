import { engine } from "@/lib/executive-team/autonomy/engine";
import { executiveState } from "@/lib/executive-team/shared/executive-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/executive/dashboard
 * Single aggregated payload for the Executive Team dashboard:
 * engine status, crew roster (+ per-role stats), latest decisions / insights /
 * action items / executions. Never triggers expensive work on its own.
 */
const CREW_META: { role: string; label: string; domain: string; blurb: string }[] = [
  { role: "ceo", label: "CEO", domain: "Strategy · P&L", blurb: "Vision, priorities, approves decisions, appoints new roles on gaps." },
  { role: "cfo", label: "CFO", domain: "Finance", blurb: "Unit economics, runway, pricing, ROI, budget arbitration." },
  { role: "cto", label: "CTO", domain: "Technology", blurb: "Architecture, tech radar, security posture, technical debt." },
  { role: "coo", label: "COO", domain: "Operations", blurb: "Processes, playbooks, incident response, validates opportunities." },
  { role: "cmo", label: "CMO", domain: "Marketing", blurb: "Demand gen, brand, content + social automation, Meta ads hardening." },
  { role: "cro", label: "CRO", domain: "Revenue", blurb: "Pipeline, conversion, revenue ops, expansion." },
  { role: "cio", label: "CIO", domain: "Intelligence", blurb: "Market, competitor & regulatory intel + opportunity radar." },
  { role: "swe", label: "SWE", domain: "Engineering", blurb: "Turns approved decisions into code via GitHub PRs." },
];

export async function GET() {
  engine.maybeAutoStart();
  const decisions = executiveState.getDecisions();
  const insights = executiveState.getInsights();
  const actionItems = executiveState.getActionItems();
  const executions = executiveState.getExecutions();
  const runs = executiveState.getRuns();
  const lastRun = runs[runs.length - 1] ?? null;

  // Every role that actually produced something (static crew + CEO-appointed dynamics).
  const rolesSeen = new Set<string>(["ceo", "cfo", "cto", "coo", "cmo", "cro", "cio", "swe"]);
  decisions.forEach((d) => rolesSeen.add(d.role));
  insights.forEach((i) => rolesSeen.add(i.owner));
  actionItems.forEach((a) => rolesSeen.add(a.owner));
  executions.forEach((e) => rolesSeen.add(e.role));

  const statsFor = (role: string) => {
    const d = decisions.filter((x) => x.role === role);
    const i = insights.filter((x) => x.owner === role);
    const a = actionItems.filter((x) => x.owner === role);
    const e = executions.filter((x) => x.role === role);
    const conf = e.map((x) => x.confirmation ?? 0).filter((x) => x > 0);
    return {
      decisions: d.length,
      approved: d.filter((x) => x.approved).length,
      insights: i.length,
      actions: a.length,
      executions: e.length,
      avgConfirmation: conf.length ? Math.round((conf.reduce((s, x) => s + x, 0) / conf.length) * 100) : null,
      trusted: executiveState.isRoleTrusted(role),
    };
  };

  const crew = [
    ...CREW_META.map((c) => ({ ...c, ...statsFor(c.role) })),
    ...[...rolesSeen]
      .filter((r) => !CREW_META.some((c) => c.role === r))
      .map((r) => ({
        role: r,
        label: r.toUpperCase().replace(/_/g, " "),
        domain: "Appointed role",
        blurb: "CEO-appointed dynamic role",
        ...statsFor(r),
      })),
  ];

  return Response.json({
    status: engine.getStatus(),
    lastRun: lastRun ? { id: lastRun.id, timestamp: lastRun.timestamp, summary: lastRun.summary } : null,
    crew,
    decisions: decisions
      .slice(-20)
      .reverse()
      .map((d) => ({
        id: d.id, role: d.role, decision: d.decision, rationale: d.rationale,
        approved: d.approved, risk: d.riskAssessment?.level ?? "low", confidence: d.expectedOutcome?.confidence ?? 0,
      })),
    insights: insights
      .slice(-15)
      .reverse()
      .map((i) => ({
        id: i.id, category: i.category, owner: i.owner, insight: i.insight,
        impact: i.impact, urgency: i.urgency, confidence: i.confidence,
      })),
    actionItems: actionItems
      .slice(-15)
      .reverse()
      .map((a) => ({
        id: a.id, title: a.title, owner: a.owner, priority: a.priority, status: a.status, dueDate: a.dueDate,
      })),
    executions: executions
      .slice(-15)
      .reverse()
      .map((e) => ({
        id: e.decisionId, role: e.role, decision: e.decision, status: e.status, confirmation: e.confirmation ?? null,
      })),
  });
}
