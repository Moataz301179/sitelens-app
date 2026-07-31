import { processJob } from "@/lib/agents";
import { createJob, getNextJob, updateJob } from "@/lib/queue";
import { createAnalysis, finishAnalysis } from "@/lib/db-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Triggers the background worker to process the next pending job.
 * Called by the analyze endpoint after creating a job, or can be
 * hit by a cron/scheduler for continuous processing.
 */
export async function POST(req: Request) {
  // Optional: accept a secret to prevent abuse
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: { analysisId?: string; url?: string; domain?: string; provider?: string; model?: string; apiKey?: string } | null = null;
  try { body = await req.json().catch(() => null); } catch { /* noop */ }

  // If an analysisId is provided, create a job for it (called from analyze endpoint)
  if (body?.analysisId && body?.url) {
    const jobId = await createJob(body.analysisId, body.url, body.domain ?? "unknown", body.provider, body.model);
    const creds = body.provider && body.model && body.apiKey
      ? { provider: body.provider, model: body.model, apiKey: body.apiKey }
      : null;

    // Process immediately in background (fire-and-forget, Next.js keeps running)
    processJob(jobId, creds).catch((e) => {
      console.error("Worker process failed:", e);
    });

    return Response.json({ jobId, status: "queued" });
  }

  // Otherwise, poll for the next pending job (continuous worker mode)
  const job = await getNextJob();
  if (!job) return Response.json({ status: "idle", message: "No pending jobs." });

  const creds = job.provider && job.model
    ? { provider: job.provider, model: job.model, apiKey: "" } // API key must be passed separately or stored encrypted
    : null;

  try {
    await processJob(job.id, creds);
    return Response.json({ status: "completed", jobId: job.id });
  } catch (e) {
    return Response.json({ status: "failed", jobId: job.id, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

export async function GET() {
  const job = await getNextJob();
  return Response.json({ pending: !!job, job: job ? { id: job.id, url: job.url, stage: job.stage, attempts: job.attempts } : null });
}
