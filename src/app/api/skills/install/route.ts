import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_RE = /github\.com[/:]([^/]+)\/([^/?#]+?)(?:\.git)?$/i;

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(GITHUB_RE);
  if (!m) return null;
  const owner = m[1];
  const repo = (m[2] || "").replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

interface SkillInfo {
  name: string;
  description: string;
}

/** Scan a cloned plugin for SKILL.md files (root or skills/ subdir) and read name/description frontmatter. */
async function scanSkills(dir: string): Promise<SkillInfo[]> {
  const candidates = [path.join(dir, "SKILL.md"), path.join(dir, "skills", "SKILL.md")];
  const skills: SkillInfo[] = [];
  for (const p of candidates) {
    try {
      const content = await readFile(p, "utf8");
      const name = content.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? path.basename(path.dirname(p));
      const description = content.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
      skills.push({ name, description });
    } catch {
      /* no SKILL.md at this location — ignore */
    }
  }
  return skills;
}

/**
 * POST /api/skills/install — clone a GitHub repo as a project-level skill/plugin.
 * Target: <project>/.zcode/cli/plugins/<plugin-name>/  (auto-discovered by the agent
 * runtime on the next turn). Returns the install location and any SKILL.md files found.
 */
export async function POST(req: Request) {
  let body: { repoUrl?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const repoUrl = (body.repoUrl ?? "").trim();
  if (!repoUrl) return NextResponse.json({ ok: false, error: "Missing repoUrl." }, { status: 400 });

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return NextResponse.json({ ok: false, error: "Not a valid GitHub repository URL." }, { status: 400 });

  const pluginName = (body.name ?? "").trim() || parsed.repo;
  const safeName = pluginName.replace(/[^a-zA-Z0-9._-]/g, "-") || "plugin";

  const pluginsRoot = path.join(process.cwd(), ".zcode", "cli", "plugins");
  const targetDir = path.join(pluginsRoot, safeName);

  // Already installed?
  try {
    const st = await stat(targetDir);
    if (st.isDirectory()) {
      const existing = await scanSkills(targetDir);
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, already: true, location: targetDir, pluginName: safeName, skills: existing });
      }
      // Leftover / partial clone without SKILL.md — clear it so we can clone fresh.
      await rm(targetDir, { recursive: true, force: true });
    }
  } catch {
    /* target does not exist yet — proceed to clone */
  }

  const execFileP = promisify(execFile);
  try {
    await mkdir(pluginsRoot, { recursive: true });
    await execFileP("git", ["clone", "--depth", "1", repoUrl, targetDir], { timeout: 120_000 });
    const skills = await scanSkills(targetDir);
    return NextResponse.json({ ok: true, already: false, location: targetDir, pluginName: safeName, skills });
  } catch (err) {
    try {
      await rm(targetDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
    const message = err instanceof Error ? err.message : "Install failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
