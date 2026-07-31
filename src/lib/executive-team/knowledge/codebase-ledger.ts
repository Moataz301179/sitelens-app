/**
 * Codebase Refinement Ledger — the operational memory of the engineering layer.
 *
 * WHY THIS EXISTS
 *   Without it, the Software Engineer agent re-derives everything from scratch on
 *   every tick: it re-scans the audit, re-decides "how", and can open duplicate or
 *   conflicting PRs. That wastes tokens/time and creates merge conflicts.
 *
 * WHAT IT STORES (incremental + accumulated, persisted to disk)
 *   1. refinements — per (domain, category, concern): what was done and to what
 *      status (planned → refurbished/merged). Idempotency: once a concern is
 *      handled we don't re-raise it.
 *   2. patterns     — the "HOW & WHERE" library: for each concern, the learned
 *      fix approach + discovered location. Reused on later runs instead of
 *      re-deriving, so the agent gets smarter, not heavier.
 *   3. inFlight     — concerns currently behind an open PR, so two decisions never
 *      both target the same concern at once (conflict avoidance).
 *
 * RELATIONSHIP TO THE OBSIDIAN / AWARENESS MEMORY
 *   This is a SEPARATE, additive layer. The shared executiveState "brain" (and any
 *   Obsidian vault) holds strategic team awareness; this ledger holds concrete
 *   code-change history. After each run the SWE publishes only a light COUNT
 *   summary into the brain so awareness stays informed without duplicating data.
 *
 * PERSISTENCE
 *   memory/codebase-ledger.json (machine) + memory/codebase-ledger.md (human /
 *   Obsidian-friendly library). Write-through on every mutation; accumulates
 *   across the 24/7 loop and process restarts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const LEDGER_DIR = path.join(process.cwd(), 'memory');
const LEDGER_JSON = path.join(LEDGER_DIR, 'codebase-ledger.json');
const LEDGER_MD = path.join(LEDGER_DIR, 'codebase-ledger.md');

export type RefinementStatus = 'planned' | 'refurbished' | 'refined' | 'merged' | 'failed';

export interface RefinementEntry {
  id: string; // `${domain}::${category}::${concern}`
  domain: string;
  category: string;
  concern: string;
  title: string;
  status: RefinementStatus;
  approach: string;
  location?: string; // target file/path, filled once known
  byDecision: string;
  prUrl?: string;
  at: string;
}

export interface PatternEntry {
  key: string; // `${category}::${concern}`
  category: string;
  concern: string;
  how: string;
  where: string[];
  learnedFrom: string;
  at: string;
}

export interface Ledger {
  version: number;
  updatedAt: string;
  refinements: Record<string, RefinementEntry>;
  patterns: Record<string, PatternEntry>;
  inFlight: Record<string, string>; // refinementId -> decisionId
}

const DEFAULT_LEDGER: Ledger = {
  version: 1,
  updatedAt: new Date().toISOString(),
  refinements: {},
  patterns: {},
  inFlight: {},
};

const HANDLED: RefinementStatus[] = ['planned', 'refurbished', 'refined', 'merged'];

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function load(): Ledger {
  try {
    if (fs.existsSync(LEDGER_JSON)) {
      const raw = fs.readFileSync(LEDGER_JSON, 'utf8');
      const parsed = JSON.parse(raw) as Partial<Ledger>;
      return { ...DEFAULT_LEDGER, ...parsed, inFlight: parsed.inFlight ?? {} };
    }
  } catch {
    /* corrupt or missing → start fresh */
  }
  return { ...DEFAULT_LEDGER };
}

class CodebaseLedger {
  private data: Ledger = load();

  private persist(): void {
    this.data.updatedAt = new Date().toISOString();
    try {
      fs.mkdirSync(LEDGER_DIR, { recursive: true });
      fs.writeFileSync(LEDGER_JSON, JSON.stringify(this.data, null, 2), 'utf8');
      fs.writeFileSync(LEDGER_MD, this.toMarkdown(), 'utf8');
    } catch {
      /* disk write failing must never break the crew */
    }
  }

  /** Has this concern already been handled (so we don't re-raise it)? */
  isAlreadyHandled(domain: string, category: string, concern: string): boolean {
    const e = this.data.refinements[`${domain}::${category}::${concern}`];
    return !!e && HANDLED.includes(e.status);
  }

  /** Is this concern currently behind an open PR from a DIFFERENT decision? */
  isConflicting(domain: string, category: string, concern: string, decisionId: string): boolean {
    const id = `${domain}::${category}::${concern}`;
    const owner = this.data.inFlight[id];
    return !!owner && owner !== decisionId;
  }

  /** Reserve a concern for a decision (idempotent reservation). */
  open(domain: string, category: string, concern: string, title: string, decisionId: string): string {
    const id = `${domain}::${category}::${concern}`;
    if (!this.data.refinements[id]) {
      this.data.refinements[id] = {
        id, domain, category, concern, title,
        status: 'planned', approach: '', byDecision: decisionId, at: new Date().toISOString(),
      };
    } else {
      this.data.refinements[id].status = 'planned';
      this.data.refinements[id].byDecision = decisionId;
      this.data.refinements[id].at = new Date().toISOString();
    }
    this.data.inFlight[id] = decisionId;
    this.persist();
    return id;
  }

  /** Finalize a refinement after the apply step. Records the pattern too. */
  complete(
    domain: string, category: string, concern: string, title: string,
    decisionId: string, opts: { status: RefinementStatus; approach: string; location?: string; prUrl?: string },
  ): void {
    const id = `${domain}::${category}::${concern}`;
    const prev = this.data.refinements[id];
    this.data.refinements[id] = {
      id, domain, category, concern, title,
      status: opts.status,
      approach: opts.approach || prev?.approach || '',
      location: opts.location ?? prev?.location,
      byDecision: decisionId,
      prUrl: opts.prUrl ?? prev?.prUrl,
      at: new Date().toISOString(),
    };
    delete this.data.inFlight[id];

    const pkey = `${category}::${concern}`;
    this.data.patterns[pkey] = {
      key: pkey, category, concern,
      how: opts.approach || prev?.approach || '',
      where: opts.location ? [opts.location] : (prev?.location ? [prev.location] : []),
      learnedFrom: decisionId, at: new Date().toISOString(),
    };
    this.persist();
  }

  /** Reuse a previously learned "how & where" for a concern, if any. */
  findPattern(category: string, concern: string): PatternEntry | undefined {
    return this.data.patterns[`${category}::${concern}`];
  }

  get counts() {
    const r = Object.values(this.data.refinements);
    return {
      refinements: r.length,
      handled: r.filter((x) => HANDLED.includes(x.status)).length,
      inFlight: Object.keys(this.data.inFlight).length,
      patterns: Object.keys(this.data.patterns).length,
    };
  }

  get raw(): Ledger {
    return this.data;
  }

  toMarkdown(): string {
    const r = Object.values(this.data.refinements).sort((a, b) => b.at.localeCompare(a.at));
    const p = Object.values(this.data.patterns);
    const lines: string[] = [];
    lines.push(`# Codebase Refinement Library`);
    lines.push(`_Auto-maintained by the Software Engineer agent. Accumulates across runs; complements (does not replace) the team awareness memory._`);
    lines.push(`Updated: ${this.data.updatedAt}`);
    lines.push(`Stats: ${r.length} refinements (${this.counts.handled} handled, ${this.counts.inFlight} in-flight), ${p.length} learned patterns.`);
    lines.push(``);
    lines.push(`## How & Where (patterns)`);
    if (p.length) {
      for (const e of p) {
        lines.push(`- **[${e.category}] ${e.concern}** — ${e.how}${e.where.length ? ` → ${e.where.join(', ')}` : ''}`);
      }
    } else {
      lines.push(`- (none yet)`);
    }
    lines.push(``);
    lines.push(`## Refinement history`);
    if (r.length) {
      for (const e of r) {
        lines.push(`- [${e.status}] ${e.domain} · ${e.category} · ${e.title}${e.prUrl ? ` → ${e.prUrl}` : ''}`);
      }
    } else {
      lines.push(`- (none yet)`);
    }
    return lines.join(`\n`);
  }
}

/** Process-wide singleton so the ledger accumulates within and across runs. */
export const codebaseLedger = new CodebaseLedger();
