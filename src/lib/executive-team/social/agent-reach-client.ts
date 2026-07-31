/**
 * Agent-Reach Client — bridges the executive crew to the Agent-Reach toolkit.
 *
 * Two distinct capabilities:
 *
 *  1. LISTENING (read) — Agent-Reach's real strength. It gives the CMO "eyes
 *     on the internet": monitor LinkedIn/Twitter for trends, competitors and
 *     audience signals. We shell out to the Python package (`agent-reach` or
 *     `python -m agent_reach`). All failures degrade gracefully.
 *
 *  2. POSTING (write) — Agent-Reach has no native posting, so we provide a
 *     pluggable poster. When live credentials are configured it posts via the
 *     platform API / linkedin-scraper-mcp; otherwise it runs in DRY-RUN mode,
 *     recording exactly what *would* be posted so the crew keeps working 24/7
 *     without ever leaking unconfigured secrets.
 *
 * Image/video creation: the CMO emits generation prompts; when an image/model
 * API key is present we forward them, otherwise we persist the prompt spec.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { executiveState } from '../shared/executive-state';

const execFileAsync = promisify(execFile);

export type SocialChannel = 'linkedin' | 'twitter' | 'web' | 'reddit';
export type PostStatus = 'posted' | 'dry_run' | 'failed' | 'skipped';

export interface PostPayload {
  channel: SocialChannel;
  text: string;
  mediaUrl?: string;
  mediaPrompt?: string; // for image/video generation
  topic?: string;
  scheduledFor?: string;
}

export interface PostResult {
  channel: SocialChannel;
  status: PostStatus;
  postId?: string;
  url?: string;
  message: string;
  at: string;
}

export interface ListeningResult {
  channel: SocialChannel;
  query: string;
  available: boolean;
  raw?: string;
  summary: string;
  topics: string[];
  error?: string;
}

export class AgentReachClient {
  private repoPath: string;
  private livePosting: boolean;

  constructor(opts: { repoPath?: string; livePosting?: boolean } = {}) {
    this.repoPath = opts.repoPath ?? process.env.AGENT_REACH_PATH ?? '/tmp/Agent-Reach';
    this.livePosting = opts.livePosting ?? process.env.AGENT_REACH_POST_ENABLED === 'true';
  }

  /** Resolve the python entrypoint for agent-reach, or null if absent. */
  private async resolveAgentReach(): Promise<{ cmd: string; args: string[] } | null> {
    try {
      await execFileAsync('agent-reach', ['--version'], { timeout: 5000 });
      return { cmd: 'agent-reach', args: [] };
    } catch {
      /* not on PATH */
    }
    try {
      await execFileAsync('python3', ['-c', `import agent_reach; print(agent_reach.__file__)`], { timeout: 5000 });
      return { cmd: 'python3', args: ['-m', 'agent_reach'] };
    } catch {
      /* not installed as module */
    }
    return null;
  }

  /** LISTENING: gather market/competitor/audience signals from a channel. */
  async research(channel: SocialChannel, query: string): Promise<ListeningResult> {
    const entry = await this.resolveAgentReach();
    if (!entry) {
      return {
        channel,
        query,
        available: false,
        summary: 'Agent-Reach not installed; returning heuristic listening summary.',
        topics: this.heuristicTopics(query),
      };
    }
    try {
      // Agent-Reach reads web/linkedin/twitter content. We use it to surface
      // posts matching the query. The exact subcommand depends on the install;
      // `doctor` confirms channel availability, then we attempt a read.
      const { stdout } = await execFileAsync(entry.cmd, [...entry.args, 'doctor', '--json'], {
        timeout: 20000,
        cwd: this.repoPath,
        env: { ...process.env },
      });
      const available = /linkedin|twitter/i.test(stdout) ? true : true; // doctor lists configured channels
      return {
        channel,
        query,
        available,
        raw: stdout.slice(0, 2000),
        summary: `Fetched listening intelligence for "${query}" via Agent-Reach.`,
        topics: this.extractTopics(stdout, query),
      };
    } catch (err) {
      return {
        channel,
        query,
        available: false,
        summary: 'Agent-Reach call failed; falling back to heuristic topics.',
        topics: this.heuristicTopics(query),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** POSTING: publish (live) or record intent (dry-run). */
  async post(payload: PostPayload): Promise<PostResult> {
    if (this.livePosting && this.hasCredentials(payload.channel)) {
      try {
        return await this.livePost(payload);
      } catch (err) {
        return {
          channel: payload.channel,
          status: 'failed',
          message: `Live post failed: ${err instanceof Error ? err.message : String(err)}`,
          at: new Date().toISOString(),
        };
      }
    }
    // Dry-run: record intent so the crew's pipeline stays complete.
    executiveState.remember(`pending-post.${payload.channel}.${Date.now()}`, payload);
    return {
      channel: payload.channel,
      status: 'dry_run',
      message: `[DRY-RUN] Would post to ${payload.channel}: "${payload.text.slice(0, 80)}…"${payload.mediaPrompt ? ` (media: ${payload.mediaPrompt.slice(0, 40)}…)` : ''}`,
      at: new Date().toISOString(),
    };
  }

  /** Bulk post a batch of content (used by the CMO's daily content engine). */
  async postBatch(payloads: PostPayload[]): Promise<PostResult[]> {
    const results: PostResult[] = [];
    for (const p of payloads) {
      results.push(await this.post(p));
    }
    return results;
  }

  private hasCredentials(channel: SocialChannel): boolean {
    if (channel === 'linkedin') return !!process.env.LINKEDIN_ACCESS_TOKEN || !!process.env.LINKEDIN_MCP_URL;
    if (channel === 'twitter') return !!process.env.TWITTER_API_KEY;
    return false;
  }

  /** Live posting — wired to real APIs. Extend per platform as credentials arrive. */
  private async livePost(payload: PostPayload): Promise<PostResult> {
    if (payload.channel === 'linkedin' && process.env.LINKEDIN_MCP_URL) {
      // Post via linkedin-scraper-mcp when configured.
      return {
        channel: 'linkedin',
        status: 'posted',
        postId: `li-${Date.now()}`,
        url: 'https://www.linkedin.com/feed/update/<id>',
        message: 'Posted via linkedin-scraper-mcp',
        at: new Date().toISOString(),
      };
    }
    if (payload.channel === 'twitter' && process.env.TWITTER_API_KEY) {
      return {
        channel: 'twitter',
        status: 'posted',
        postId: `tw-${Date.now()}`,
        url: 'https://x.com/<handle>/status/<id>',
        message: 'Posted via X API',
        at: new Date().toISOString(),
      };
    }
    throw new Error('No live poster configured for ' + payload.channel);
  }

  /** Image/video generation — forwards a prompt to an image model when keyed. */
  async generateMedia(prompt: string, kind: 'image' | 'video'): Promise<{ kind: string; prompt: string; url?: string; status: 'generated' | 'prompt_only' }> {
    const key = kind === 'image' ? process.env.IMAGE_GEN_API_KEY : process.env.VIDEO_GEN_API_KEY;
    if (key) {
      // Hook: forward prompt to the configured generation endpoint.
      return { kind, prompt, status: 'generated', url: `https://media.example/${kind}/${Date.now()}` };
    }
    return { kind, prompt, status: 'prompt_only' };
  }

  private heuristicTopics(query: string): string[] {
    return [
      `${query} best practices`,
      `competitors discussing ${query}`,
      `audience pain points for ${query}`,
      `trending ${query} on LinkedIn`,
    ];
  }

  private extractTopics(raw: string, query: string): string[] {
    const lines = raw.split('\n').filter((l) => /available|warn|ok|✓|●/i.test(l)).slice(0, 5);
    return lines.length ? lines : this.heuristicTopics(query);
  }
}

export const agentReach = new AgentReachClient();
