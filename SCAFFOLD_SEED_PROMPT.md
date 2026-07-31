# SEED PROMPT — SiteLens: Autonomous "Executive Team" Website-Audit OS

> Paste this entire file into VS Code (Copilot Chat / Claude / any coding agent) with the
> **working root set to `/Users/Moataz/.zcode/workspace/default/ai-website-audit-platform/`**.
> It scaffolds the whole platform from one prompt: the multi-agent audit engine, the autonomous
> Executive Team, the Software-Engineer apply channel, the incremental refinement ledger, report
> persistence, the dashboard button, and the deployment harness — including the hard security
> constraints that MUST NOT be violated.

---

## 0. ROLE & GOAL
You are scaffolding **SiteLens**, a Next.js platform that is not just a website auditor but a
self-running **operating system for a virtual executive team**. It audits any URL with 10 specialist
agents, then a persistent crew of executive agents (CEO, CIO, CFO, CTO, CMO, CSO, COO) makes decisions,
and a **Software Engineer (SWE) agent** turns those decisions into code via Pull Requests. The system
is **incremental and accumulating**: it never re-scans the whole app from scratch; it keeps a
refinement ledger of *how & where* things were fixed.

## 1. ROOT & STACK
- **Root (working dir):** `/Users/Moataz/.zcode/workspace/default/ai-website-audit-platform/`
- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.9
- **Styling:** Tailwind CSS v4
- **Data:** Drizzle ORM + PostgreSQL (`pg`), optional
- **Misc:** `cheerio` (server-side HTML parsing), `lucide-react` (icons), `zod`
- **Runtime target:** Node.js (API routes use `export const runtime = "nodejs"`)
- **Process manager (prod):** pm2 via `ecosystem.config.js`; reverse proxy nginx; `next start` on PORT 3000

Do NOT run `create-next-app` over an existing dir. Build the files directly into the root above.

## 2. WHAT TO BUILD (phases)

### Phase A — Audit engine (10 agents)
- A real `stage1Gather(url)` that fetches the live site (response, weight, headers, markup signals) and
  derives 6 weighted scores (SEO, accessibility, security, performance, best-practices, UX) — scored from
  a real fetch, NOT screenshots. Use Lighthouse/PageSpeed when `PAGESPEED_API_KEY` is set, else transparent
  heuristics.
- 10 agents (market, idea-validation, business-logic, UX, compliance, security, QA, …) produce issues with
  `severity`, `category`, `estimatedRevenueImpact`, `fixEffort`, `autoFixable`, plus a corrective prompt.
- A GitHub tool-finder maps each weakness to the most-starred open-source fix.
- Key files: `src/lib/analyzer.ts`, `src/lib/schema.ts`, `src/lib/types.ts`, `src/lib/agentMeta.ts`,
  `src/app/api/analyze/route.ts` (streaming `text/event-stream`), `src/app/api/analyses/route.ts`,
  `src/app/api/analysis/[id]/route.ts`, `src/app/api/chat/route.ts`, `src/components/ReportView.tsx`.

### Phase B — Autonomous Executive Team
- `BaseExecutiveAgent` with `analyze → makeDecisions → generateInsights → createActionItems`.
- Static roles (union `ExecutiveRole`): `ceo, cio, cfo, cto, cmo, cso, coo` plus `vp_*` aliases and `swe`.
- `SyntheticAgent` (CEO-appointed dynamic roles) + gap detection. `ExecutiveCoordinator` runs `CREW_ORDER`
  (the 7 exec roles; `swe` is NOT in crew order — it is an executor invoked separately).
- `AutonomousEngine`: 24/7 loop (`tick()`), autostart via `instrumentation.ts` `register()` when
  `EXECUTIVE_ENGINE_AUTOSTART==='true'`. Targets `EXECUTIVE_TARGET_URL` via `contextForSite()`
  (fallback to synthetic seed business).
- Shared singleton `executiveState` ("the brain"): pub/sub memory, decisions/insights/actions/executions,
  metric history, per-role confirmation scoring (`isRoleTrusted` trust brake),
  `recordExecution` / `completeExecution`.
- Balance model: confidence gate `0.7`; `classifyExecutionRisk` risk-tier hold; trust brake;
  **dry-run-by-default for outward actions; PR-only apply channel** (never force-push main; human merges).
- Key files: `src/lib/executive-team/{shared,coordinator,autonomy,swe,knowledge,integrations}/**`,
  `src/lib/executive-team/index.ts`, `src/app/api/executive/{run,status,report}/route.ts`,
  `scripts/audit-to-context.ts`, `src/instrumentation.ts`.

### Phase C — Software Engineer apply channel + incremental ledger
- `src/lib/executive-team/swe/swe-agent.ts`: `SWEAgent extends BaseExecutiveAgent` (role `swe`).
  `implementDecision(decision, ctx)` consults the ledger (skips already-handled, avoids in-flight
  conflicts), writes a local spec to `generated/swe/`, and — only if `loadGitHubConfig()` +
  `APPLY_ENABLED==='true'` — opens a PR via `applyFixesViaPR` / `pushViaSSH`. Returns
  `{mode:'pr'|'ssh'|'dry-run'|'skipped', title, prUrl?, prNumber?, branch?, files, notes}`.
  Otherwise falls back to dry-run. `applySite(ctx)` synthesizes a decision and calls `implementDecision`.
- `src/lib/executive-team/knowledge/codebase-ledger.ts`: singleton `codebaseLedger`, persisted to
  `memory/codebase-ledger.json` + Markdown mirror. Stores `refinements` (key `domain::category::concern`,
  statuses incl. handled = `planned/refurbished/refined/merged`), `patterns` (how & where), `inFlight`
  (idempotency + conflict avoidance). **This is OPERATIONAL memory, orthogonal to and NOT replacing the
  team's strategic awareness / Obsidian memory.** It only publishes a light count summary to
  `executiveState`.
- `src/lib/executive-team/integrations/github.ts`: `loadGitHubConfig()` (needs `GITHUB_REPO` + token/SSH),
  `applyFixesViaPR`, `pushViaSSH` — never force-pushes main; PR-only, human merges.

### Phase D — Persistence (Drizzle)
- `src/db/schema.ts` (tables: `analyses`, `chatSessions`, `auditJobs`, `auditCache`, `rateLimits`,
  `auditScreenshots`), `src/db/index.ts` (Pool, `isDbConfigured`), `src/lib/db-helpers.ts` (graceful:
  all functions `NO_DB`-safe, return null/fallback without throwing).
- `drizzle.config.ts` reads `DATABASE_URL` from env. Add npm scripts `db:push`, `db:generate`, `db:studio`.
- `/api/health` must return `200 {ok:true, database, dbConfigured}` even WITHOUT a DB (report DB status as
  a field, never 500).

### Phase E — Dashboard "Apply fixes" button
- `src/components/ApplyFixesButton.tsx`: URL field (prefilled from the dashboard's current URL),
  **Apply fixes** → `POST /api/executive/apply {url}`; renders PR link / dry-run note / "nothing new".
  Plus a **Library** toggle → `GET /api/executive/library` (returns ledger counts + learned patterns).
- `src/app/api/executive/apply/route.ts`: `POST {url}` → `contextForSite(url)` →
  `softwareEngineer.applySite(ctx)`; `GET` returns last applies. `runtime='nodejs'`.
- `src/app/api/executive/library/route.ts`: `GET` returns ledger counts, markdown, patterns, refinements.
- Mount `ApplyFixesButton` on `src/components/HomeClient.tsx` in a new **"Autonomous executive team"** section.

### Phase F — Deployment
- `ecosystem.config.js`: pm2, `name:'sitelens'`, `script:'npm', args:'run start'`, `instances:1`,
  `exec_mode:'fork'`, env template (NODE_ENV, PORT, and commented OPENROUTER_API_KEY / GITHUB_REPO /
  GITHUB_TOKEN / APPLY_ENABLED / EXECUTIVE_ENGINE_AUTOSTART / EXECUTIVE_TARGET_URL / DATABASE_URL).
- `instrumentation.ts` `register()` starts `engine.start()` when `EXECUTIVE_ENGINE_AUTOSTART==='true'`.
- `.env.example` documents every var (everything optional; dry-run with none set).

## 3. ⚠️ HARD SECURITY CONSTRAINTS (REMINDERS — DO NOT VIOLATE)
1. **Dry-run by default.** No outward action (repo push, ad edit, social post) may occur without explicit
   credentials present in env. The system MUST run fully keyless: scan, plan, write specs, report — but
   touch no repo, push nothing.
2. **GitHub apply channel is credential-gated and PR-only.** Never force-push `main`; never delete
   branches; a human merges. `APPLY_ENABLED` must be an explicit `true` — never implied.
3. **The GitHub PAT must NEVER be written to disk programmatically or echoed back in any message.**
   If a token is provided in chat, it belongs only in the user's local `.env` (which is git-ignored via
   `.env`/`.env.*`) at the user's explicit request, and the user should ROTATE it afterward. Do not commit
   it, do not print it in logs or chat.
4. **Confirmation measurement must not fabricate revenue.** Any reported impact must reflect real execution
   success + real metric deltas, not invented dollar figures.
5. **Meta Ads edits are dry-run** unless BOTH `META_ACCESS_TOKEN` and `META_AD_ACCOUNT_ID` are set; live
   Meta edits are hard to undo. Disable view-through attribution, misplacement, and enhancement by default.
6. **No secrets required to run.** A missing key disables a capability; it never crashes the app.

## 4. RECOMMENDATIONS (do these)
- Keep the Codebase Refinement Ledger out of source control by default (`memory/` is git-ignored); commit
  it only to seed/share the library across servers.
- Use `instrumentation.ts` for autostart rather than a cron; keep `instances:1` (the brain is a singleton).
- Prefer PRs over direct pushes; surface PR URLs in the dashboard result card.
- Add an `EXECUTIVE_TARGET_URL` so the 24/7 loop is grounded in the real site, not just synthetic seed data.
- Run `npm run db:push` only after `DATABASE_URL` is set; without it the app still works (graceful).
- After testing with a real PAT, **rotate the token**.

## 5. ACCEPTANCE / VERIFY
- `npm run build` exits 0; `npm start` boots keyless.
- `GET /` → 200; `GET /api/health` → 200 `{ok:true,database:false,dbConfigured:false}` with NO DB.
- `GET /api/executive/library` → 200 JSON with ledger counts.
- `POST /api/executive/apply {url}` with apply disabled → `{mode:'dry-run'}` (local spec written, no PR).
- With `GITHUB_REPO` + `APPLY_ENABLED=true` + token → `{mode:'pr', prUrl}` and PR opened (human merges).
- Running the ledger twice on the same site → second run `skipped` ("already refined") — proving
  incrementality and no conflict.

---
*This seed regenerates the full system. Follow the security constraints in §3 verbatim; they override any
convenience. Build, typecheck, and smoke-test before declaring done.*
