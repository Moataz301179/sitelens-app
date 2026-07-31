# Executive AI Team — Autonomous 24/7 Engine

A self-governing crew of AI executives layered on top of the SiteLens website‑audit
platform. The crew analyzes the business, makes decisions, **executes** the
high‑confidence ones, and **measures** the real effect — then reports daily.

## Roles
- **CEO** — strategy, vision, P&L arbitration, approves/rejects crew decisions,
  and **appoints new roles** when it detects a capability gap (see below).
- **CFO** — unit economics, runway, pricing, ROI.
- **CTO** — architecture, tech radar, security posture, technical debt.
- **COO** — operations, playbooks, process efficiency, incident response, and
  **validates/executes business‑model opportunities** (affiliate, dropship, shipping).
- **CMO** — demand gen, brand, content + social automation, marketing pages, and
  **hardens Meta Ads attribution** (disables view‑through/misplacements/enhancements).
- **CRO** — pipeline, conversion, revenue ops, expansion.
- **CIO (Intelligence Officer)** — the team's "eyes and ears": market, competitor,
  regulatory & technology intelligence, plus the **opportunity radar** that surfaces
  affiliate / dropship / shipping plays for the COO to validate.

## How it works
1. `ExecutiveCoordinator.runCrew()` runs every agent (`analyze → decide →
   insight → actions`) against one shared `ExecutiveContext`.
2. A shared `ExecutiveState` ("the brain") synchronizes decisions,
   communications, insights, action items and a metric‑history across all agents.
3. The `AutonomousEngine` takes every **approved** decision and executes a
   concrete side‑effect (post social content, write remediation prompts, publish
   a marketing page, open a sales task) — it does not merely report.
4. Each execution is measured: baseline → latest metric delta plus a
   **confirmation score** (0–1) comparing promised vs delivered impact.
5. `DailyReportBuilder` assembles the daily report (performance, issues,
   enhancements, results, effects measurement) and writes `generated/daily-report-<date>.md`.

## Run it
- **One‑off:** `POST /api/executive/run`
- **Status:** `GET /api/executive/status` (also auto‑starts the loop if
  `EXECUTIVE_ENGINE_AUTOSTART=true`)
- **Control:** `POST /api/executive/status` with `{ "action": "start" | "stop" | "tick" | "report" }`
- **Daily report:** `GET /api/executive/report`

For durable 24/7 operation, run `scripts/cron-executive.sh` on a schedule
(e.g. every 30 min). With `EXECUTIVE_ENGINE_AUTOSTART=true` the loop also
self‑starts when the server boots.

## Environment
- `OPENROUTER_API_KEY` (or the provider key used by `@/lib/llm`) — enables the
  agents' LLM‑powered reasoning. Without it the crew still runs on its
  deterministic heuristics and reports partial output.
- `AGENT_REACH_PATH` — location of the cloned Agent‑Reach toolkit
  (https://github.com/Panniantong/Agent-Reach). Used for **market listening**
  (LinkedIn/Twitter trend & competitor intelligence).
- `AGENT_REACH_POST_ENABLED=true` + `LINKEDIN_ACCESS_TOKEN` / `TWITTER_API_KEY`
  (or `LINKEDIN_MCP_URL`) — switches social posting from safe **dry‑run** to
  live publishing.
- `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` — enables the CMO to **live‑apply**
  the Meta Ads attribution hardening (disabling view‑through, misplacements and
  Advantage+ enhancements). Without them the step is a safe **dry‑run** that only
  logs the exact Graph API calls it would make.
- `IMAGE_GEN_API_KEY` / `VIDEO_GEN_API_KEY` — enables real image/video
  generation from the CMO's prompts (otherwise prompt specs are persisted).
- **Apply channel (change code in a repo you own).** The agent does **not** edit
  the audited site directly; it opens a fix branch + PR against a repo that holds
  the source. Provide **one** transport:
  - `GITHUB_TOKEN` (classic PAT `repo`, or fine‑grained with `contents:write` +
    `pull_requests:write`) **and** `GITHUB_REPO=owner/site-source`, **or**
  - `GITHUB_SSH_KEY` (private key) + `REPO_LOCAL_PATH` (local clone) for git push.
  - `APPLY_ENABLED=true` — explicit opt‑in; never implied. Without it (or without
    the above) the execute step writes local fix specs only and pushes nothing.
  - `OPENROUTER_API_KEY` — lets the agent draft **real code diffs** mapped to your
    repo's files; without it the opened PR carries remediation **specs** (markdown).
- `EXECUTIVE_ENGINE_AUTOSTART=true` — auto‑start the loop on server boot.

## New capabilities (applied)
1. **Shared real‑time memory.** Every agent subscribes to the shared brain and
   `syncMemory()`s before each analysis, so when one agent publishes a fact
   (e.g. the CIO's opportunity radar) all others receive it **on the spot**.
2. **Meta Ads attribution hardening.** The CMO disables three default‑on,
   spend‑inflating Meta settings: view‑through attribution, low‑quality
   placements (audience network / instream / reels overlay) and Advantage+
   enhancements. Dry‑run unless `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` set.
3. **COO opportunity radar + validation gate.** The CIO identifies affiliate /
   dropship / shipping opportunities; the COO runs a **business‑logic +
   validation‑test gate** (`validateOpportunity`) and only lets *passed* plays
   become executable action items. Nothing reaches execution unvalidated.
4. **Intelligence Officer (CIO).** New crew member owning market/competitor/
   regulatory intelligence and the opportunity radar — the signal source the rest
   of the team acts on.
5. **CEO dynamic role creation (aggressive, with guardrails).**
   `CEOAgent.proposeNewRoles()` is aggressive — it scans for *many* grounded
   capability gaps (high churn → Retention Officer; low growth → Growth Officer;
   heavy competition → Partnerships lead; critical security issues → CISO;
   negative regulation → Compliance Officer; low NPS → Customer Success) and the
   coordinator spins up a `SyntheticAgent` for each. Every trigger is tied to a
   concrete metric, so gaps are never hallucinated. Guardrails in the coordinator
   prevent code conflicts / runaway or hallucinated roles:
   - **Per-run cap** (default 3) on how many roles can be appointed per run.
   - **Id safety**: ids are sanitized to `[a-z0-9_]+` and rejected on collision
     with any static crew role or an already-created role.
   - **No domain overlap**: a role whose `domain` is already owned by the static
     crew (strategy/finance/tech/ops/marketing/sales/intelligence) or already
     created is rejected — prevents two agents owning one scope.
   - **Spec completeness**: incomplete `RoleSpec`s are rejected before creation.
   - **Balanced autonomy (real effect *and* safety)**. A CEO‑appointed role is
     given **real effect**, not just a report: its low‑risk decisions
     (analysis, plans, local/reversible actions) are auto‑approved and executed
     like any crew member. But it is governed by two brakes so it can never cause
     outward harm:
     - **Risk‑tier hold** (`classifyExecutionRisk` in `autonomy/engine.ts`): any
       external / irreversible / credentialed action — live social posting,
       live Meta edits, email sends — is **held for human approval** even when
       auto‑approved. Local, reversible work still executes.
     - **Trust brake** (`executiveState.isRoleTrusted`): every execution is
       measured against the promised impact. A role whose work consistently fails
       measurement (avg confirmation < 0.3 over ≥3 runs) is **auto‑demoted** and
       paused until a human intervenes. New roles start trusted so they get a fair
       chance to prove value.

## Full autonomous lifecycle
`scripts/lifecycle.ts` runs the complete closed loop against a live URL:

```
scan → identify → plan → generate todos → execute → report (before/after)
```

1. **SCAN** — real fetch + security scan (+ Lighthouse if reachable) → audit scores.
2. **IDENTIFY** — the audit's top issues become the work list.
3. **PLAN** — a remediation plan grouped by category (`generated/plan-<domain>.md`).
4. **TODOS** — a checklist (`generated/todos-<domain>.md`) pre‑checked for auto‑fixable items.
5. **EXECUTE** — credential‑gated. With `GITHUB_REPO` + token + `APPLY_ENABLED=true`
   it opens a fix PR (specs, or real diffs if `OPENROUTER_API_KEY` is set). Otherwise it
   writes local fix specs (`generated/fixes/<domain>/`) and records a dry‑run execution.
6. **REPORT** — re‑scans and emits a before/after score table
   (`generated/report-<domain>.md`). In dry‑run the deltas are 0 (nothing changed);
   after a PR is merged + deployed, re‑running shows the real improvement.

Run it: `npx tsx scripts/lifecycle.ts https://www.hotelsvendors.com`
The CEO's dynamic‑role + arbitration layer also runs here, so a weak security posture
(e.g. security score 40/100) triggers the CISO + Compliance Officer being stood up.

## Notes & limitations
- Agent‑Reach is a **read/listening** tool; this integration uses it for market
  intelligence and adds a separate pluggable **posting** layer (dry‑run by
  default so no secrets are required to run).
- Meta Ads changes are **dry‑run by default**; live changes need
  `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` and are never performed otherwise.
- Effect measurement is honest: confirmation reflects execution success and
  metric deltas. Revenue attribution requires connecting live data sources
  (DB, CRM, analytics) into `ExecutiveContext`.
- The seed `ExecutiveContext` (see `shared/context-factory.ts`) is a realistic
  stand‑in; hydrate it from your live DB/analytics for production accuracy.
