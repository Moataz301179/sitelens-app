/**
 * GitHub integration — the "apply" channel for the executive team's fixes.
 *
 * SAFETY: every function here is credential-gated. With no GITHUB_TOKEN (or
 * SSH key) it returns a dry-run result and changes NOTHING. When configured it
 * opens a dedicated fix branch, commits the changed files, and creates a Pull
 * Request — it never force-pushes to main or deletes anything.
 *
 * Two transport options:
 *   - Token (HTTPS REST API): no local clone needed. PRIMARY path.
 *   - SSH key: pushes a branch from a local clone (REPO_LOCAL_PATH). PR still
 *     opened via token if present, otherwise you open it from the push.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitHubConfig {
  repo: string; // "owner/name"
  token?: string;
  sshKey?: string; // raw key OR path to a key file
  baseBranch: string;
  localPath?: string;
  branchPrefix: string;
}

export interface FileChange {
  path: string;
  content: string;
  message: string;
}

export interface ApplyResult {
  applied: boolean;
  mode: 'pr' | 'ssh' | 'dry-run';
  url?: string;
  prNumber?: number;
  branch?: string;
  reason?: string;
}

/** Load + validate config from the environment. Returns null when not usable. */
export function loadGitHubConfig(): GitHubConfig | null {
  const repo = process.env.GITHUB_REPO;
  if (!repo) return null;
  const token = process.env.GITHUB_TOKEN;
  const sshKey = process.env.GITHUB_SSH_KEY;
  if (!token && !sshKey) return null;
  return {
    repo,
    token,
    sshKey,
    baseBranch: process.env.GITHUB_BASE_BRANCH || 'main',
    localPath: process.env.REPO_LOCAL_PATH,
    branchPrefix: process.env.GITHUB_BRANCH_PREFIX || 'fix/exec-team',
  };
}

async function githubApi(cfg: GitHubConfig, method: string, apiPath: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'exec-team',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub ${method} ${apiPath} -> ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Open a fix branch, commit each changed file, and create a Pull Request. */
export async function applyFixesViaPR(
  cfg: GitHubConfig,
  changes: FileChange[],
  title: string,
  body: string,
): Promise<ApplyResult> {
  if (!cfg.token) return { applied: false, mode: 'dry-run', reason: 'no GITHUB_TOKEN' };

  const branch = `${cfg.branchPrefix}-${Date.now()}`;
  const base = await githubApi(cfg, 'GET', `/repos/${cfg.repo}/git/ref/heads/${cfg.baseBranch}`);
  await githubApi(cfg, 'POST', `/repos/${cfg.repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: base.object.sha });

  for (const c of changes) {
    await githubApi(cfg, 'PUT', `/repos/${cfg.repo}/contents/${c.path}`, {
      message: c.message,
      content: Buffer.from(c.content).toString('base64'),
      branch,
    });
  }

  const pr = await githubApi(cfg, 'POST', `/repos/${cfg.repo}/pulls`, {
    title,
    body,
    head: branch,
    base: cfg.baseBranch,
  });
  return { applied: true, mode: 'pr', url: pr.html_url, prNumber: pr.number, branch };
}

/** SSH transport: commit + push a branch from a local clone. Returns branch. */
export async function pushViaSSH(cfg: GitHubConfig, changes: FileChange[], branch: string): Promise<string> {
  if (!cfg.localPath || !cfg.sshKey) throw new Error('SSH push requires REPO_LOCAL_PATH and GITHUB_SSH_KEY');

  let keyPath = cfg.sshKey;
  if (!keyPath.includes('-----BEGIN')) {
    // treat as a path
    if (!fs.existsSync(keyPath)) throw new Error(`SSH key path not found: ${keyPath}`);
  } else {
    keyPath = path.join(os.tmpdir(), `gh-key-${Date.now()}`);
    fs.writeFileSync(keyPath, cfg.sshKey, { mode: 0o600 });
  }

  const env = { ...process.env, GIT_SSH_COMMAND: `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null` };
  await execFileAsync('git', ['-C', cfg.localPath, 'checkout', '-b', branch], { env });
  for (const c of changes) {
    const full = path.join(cfg.localPath, c.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, c.content, 'utf8');
    await execFileAsync('git', ['-C', cfg.localPath, 'add', c.path], { env });
  }
  await execFileAsync('git', ['-C', cfg.localPath, 'commit', '-m', changes[0]?.message || 'Executive team fixes'], { env });
  await execFileAsync('git', ['-C', cfg.localPath, 'push', '-u', 'origin', branch], { env });
  return branch;
}
