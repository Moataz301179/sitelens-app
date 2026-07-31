"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, GitPullRequest, Wrench, CircleAlert, CheckCircle2 } from "lucide-react";
import { Button, Panel, Spinner } from "./ui";

interface ApplyResult {
  ok: boolean;
  mode: "pr" | "ssh" | "dry-run" | "skipped";
  title?: string;
  prUrl?: string | null;
  prNumber?: number | null;
  branch?: string | null;
  notes?: string;
}

interface LibraryData {
  counts?: { refinements: number; patterns: number; handled: number; inFlight: number };
  patterns?: { concern: string; how: string; where: string }[];
  markdown?: string;
}

export default function ApplyFixesButton({ defaultUrl = "" }: { defaultUrl?: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [libOpen, setLibOpen] = useState(false);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);

  const runApply = async () => {
    const target = url.trim();
    if (!target) {
      setError("Enter the site URL to fix first.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/executive/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.notes ?? `Apply failed (${res.status})`);
      setResult(data as ApplyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply fixes.");
    } finally {
      setBusy(false);
    }
  };

  const toggleLibrary = async () => {
    if (libOpen) {
      setLibOpen(false);
      return;
    }
    setLibOpen(true);
    setLibLoading(true);
    setLibError(null);
    try {
      const res = await fetch("/api/executive/library");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Library failed (${res.status})`);
      setLib(data as LibraryData);
    } catch (e) {
      setLibError(e instanceof Error ? e.message : "Could not load library.");
    } finally {
      setLibLoading(false);
    }
  };

  const success = result && (result.mode === "pr" || result.mode === "ssh");
  const tone = success
    ? "border-ok/40 bg-ok/10 text-ok"
    : result?.mode === "skipped"
      ? "border-line2 bg-panel2 text-mut"
      : "border-warn/40 bg-warn/10 text-warn";

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2 text-acc">
        <Wrench className="h-4 w-4" />
        <span className="font-display text-[14px] font-bold text-ink">Software Engineer — apply fixes</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
        Point the autonomous engineering agent at a site. It audits, drafts a fix spec and opens a Pull Request on your
        repo. With apply disabled it still writes a local dry-run spec so nothing is lost.
      </p>

      <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && runApply()}
          placeholder="https://example.com"
          className="w-full rounded-md border border-line2 bg-bg px-3 py-2.5 font-data text-[13.5px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none"
        />
        <Button onClick={runApply} disabled={busy} className="!px-5 !py-2.5 whitespace-nowrap">
          {busy ? (
            <>
              <Spinner /> Working…
            </>
          ) : (
            <>
              Apply fixes <GitPullRequest className="h-4 w-4" />
            </>
          )}
        </Button>
        <Button onClick={toggleLibrary} disabled={libLoading} className="!px-4 !py-2.5 whitespace-nowrap">
          {libLoading ? <Spinner /> : <BookOpen className="h-4 w-4" />}
          Library
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12.5px] font-semibold text-bad">
          {error}
        </div>
      )}

      {result && (
        <div className={`mt-3 rounded-md border px-3 py-2.5 text-[12.5px] ${tone}`}>
          <div className="flex items-center gap-1.5 font-bold">
            {success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <CircleAlert className="h-4 w-4" />
            )}
            {result.mode === "pr"
              ? "Pull Request opened"
              : result.mode === "ssh"
                ? "Branch pushed via SSH"
                : result.mode === "skipped"
                  ? "Nothing new to apply"
                  : "Dry-run (no PR)"}
          </div>
          {result.notes && <p className="mt-1 leading-relaxed">{result.notes}</p>}
          {result.prUrl && (
            <a
              href={result.prUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-bold underline"
            >
              {result.prUrl} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {libOpen && (
        <div className="mt-3 rounded-md border border-line2 bg-panel2 p-3.5">
          {libError && <div className="text-[12.5px] font-semibold text-bad">{libError}</div>}
          {lib && lib.counts && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-line2 bg-bg px-2.5 py-1 font-data text-[11.5px] text-mut">
                refinements: <b className="text-ink">{lib.counts.refinements}</b>
              </span>
              <span className="rounded-md border border-line2 bg-bg px-2.5 py-1 font-data text-[11.5px] text-mut">
                patterns: <b className="text-ink">{lib.counts.patterns}</b>
              </span>
              <span className="rounded-md border border-line2 bg-bg px-2.5 py-1 font-data text-[11.5px] text-mut">
                handled: <b className="text-ok">{lib.counts.handled}</b>
              </span>
              <span className="rounded-md border border-line2 bg-bg px-2.5 py-1 font-data text-[11.5px] text-mut">
                in-flight: <b className="text-warn">{lib.counts.inFlight}</b>
              </span>
            </div>
          )}
          {lib && lib.patterns && lib.patterns.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {lib.patterns.slice(0, 5).map((p, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-mut">
                  <span className="font-bold text-ink">{p.concern}</span>
                  {p.how ? ` — ${p.how}` : ""}
                  {p.where ? <span className="font-data text-faint"> @ {p.where}</span> : ""}
                </li>
              ))}
            </ul>
          )}
          {lib && (!lib.patterns || lib.patterns.length === 0) && (
            <p className="text-[12px] text-mut">No refinements recorded yet — the agent records them as fixes are applied.</p>
          )}
        </div>
      )}
    </Panel>
  );
}
