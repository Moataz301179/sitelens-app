/**
 * Next.js instrumentation — runs once when the server boots.
 *
 * When EXECUTIVE_ENGINE_AUTOSTART=true the autonomous engine starts its 24/7
 * loop here, so a deployed instance (pm2 / container) keeps executing without
 * any external cron. The engine self-targets EXECUTIVE_TARGET_URL when set.
 *
 * IMPORTANT: Next.js compiles instrumentation.ts for BOTH the Node.js and Edge
 * runtimes. The executive engine (and its transitive deps: github.ts,
 * codebase-ledger.ts, swe-agent.ts, agent-reach-client.ts) use Node-only APIs
 * (node:fs, node:child_process). Without the NEXT_RUNTIME guard, Turbopack
 * traces those imports into the Edge bundle, the Edge compilation errors out,
 * and the whole dev server ends up 404ing. NEXT_RUNTIME is constant-folded by
 * Next.js, so the guarded import is tree-shaken out of the Edge build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.EXECUTIVE_ENGINE_AUTOSTART === "true") {
    try {
      const { engine } = await import("@/lib/executive-team/autonomy/engine");
      engine.start();
    } catch (err) {
      console.error("[instrumentation] failed to auto-start executive engine:", err);
    }
  }
}
