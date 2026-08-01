"use client";

import { Sparkles } from "lucide-react";
import type { DesignConcept } from "@/lib/types";
import { CopyButton } from "./ui";

function MiniHero({ c, brand, tagline, domain }: { c: DesignConcept; brand: string; tagline: string; domain: string }) {
  const p = c.palette;
  const chrome = (inner: React.ReactNode) => (
    <div className="overflow-hidden rounded-lg border border-line2">
      <div className="flex items-center gap-1.5 border-b border-line2 bg-panel3 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-bad/70" />
        <span className="h-2 w-2 rounded-full bg-warn/70" />
        <span className="h-2 w-2 rounded-full bg-ok/70" />
        <span className="font-data ml-2 truncate rounded bg-black/25 px-2 py-0.5 text-[9px] text-mut">{domain}</span>
      </div>
      {inner}
    </div>
  );

  if (c.style === "conversion") {
    return chrome(
      <div style={{ background: p.bg, color: p.text }} className="px-5 py-6 text-center">
        <div className="mx-auto flex max-w-[240px] items-center justify-between text-[8px] font-bold uppercase tracking-wide" style={{ color: p.muted }}>
          <span style={{ color: p.text }}>{brand}</span>
          <span>Product · Pricing · Docs</span>
        </div>
        <div className="mx-auto mt-5 max-w-[260px] text-[15px] font-extrabold leading-snug">{tagline}</div>
        <div className="mx-auto mt-1.5 max-w-[220px] text-[8.5px] leading-relaxed" style={{ color: p.muted }}>
          One clear promise, one action. Everything below the fold supports this sentence.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="rounded-full px-4 py-1.5 text-[9px] font-extrabold" style={{ background: p.accent, color: "#fff" }}>
            Get started free
          </span>
          <span className="rounded-full border px-4 py-1.5 text-[9px] font-bold" style={{ borderColor: p.accent, color: p.text }}>
            Live demo
          </span>
        </div>
        <div className="mx-auto mt-5 flex max-w-[230px] items-center justify-between border-t pt-3 text-[7.5px] font-bold uppercase" style={{ borderColor: p.muted + "44", color: p.muted }}>
          <span>Trusted by</span>
          <span>◆ ◇ ◆ ◇</span>
        </div>
      </div>,
    );
  }

  if (c.style === "editorial") {
    return chrome(
      <div style={{ background: p.bg, color: p.text }} className="px-5 py-6">
        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest" style={{ color: p.muted }}>
          <span style={{ color: p.text }}>{brand}</span>
          <span>Index — About — Journal</span>
        </div>
        <div className="mt-5 grid grid-cols-12 gap-3">
          <div className="col-span-7">
            <div className="font-display text-[17px] font-bold leading-[1.15]">
              {tagline.split(" ").slice(0, 6).join(" ")}
              <span style={{ color: p.accent }}>.</span>
            </div>
            <div className="mt-2.5 h-[2px] w-8" style={{ background: p.accent }} />
            <div className="mt-2.5 text-[8.5px] leading-relaxed" style={{ color: p.muted }}>
              A considered reading order. Whitespace does the selling; the accent appears exactly once per screen.
            </div>
            <div className="mt-3.5 inline-block border-b pb-0.5 text-[9px] font-bold" style={{ borderColor: p.text }}>
              Read the case study →
            </div>
          </div>
          <div className="col-span-5">
            <div className="flex h-[84px] items-end rounded-sm p-2" style={{ background: p.surface, border: `1px solid ${p.muted}33` }}>
              <div className="space-y-1">
                <div className="h-1 w-14 rounded-full" style={{ background: p.accent }} />
                <div className="h-1 w-20 rounded-full" style={{ background: p.muted + "66" }} />
                <div className="h-1 w-10 rounded-full" style={{ background: p.muted + "66" }} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="h-9 rounded-sm" style={{ background: p.surface, border: `1px solid ${p.muted}33` }} />
              <div className="h-9 rounded-sm" style={{ background: p.surface, border: `1px solid ${p.muted}33` }} />
            </div>
          </div>
        </div>
      </div>,
    );
  }

  return chrome(
    <div style={{ background: p.bg, color: p.text }} className="px-5 py-6">
      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest" style={{ color: p.muted }}>
        <span style={{ color: p.accent }}>{brand}</span>
        <span className="border px-1.5 py-0.5" style={{ borderColor: p.muted + "55" }}>
          MENU
        </span>
      </div>
      <div className="font-data mt-5 text-[22px] font-bold uppercase leading-[0.95] tracking-tight">
        {tagline.split(" ").slice(0, 4).join(" ")}
        <span style={{ color: p.accent }}>{"_"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border p-2" style={{ borderColor: p.muted + "44", boxShadow: `3px 3px 0 ${p.accent}55` }}>
            <div className="font-data text-[11px] font-bold" style={{ color: p.accent }}>
              0{i + 1}
            </div>
            <div className="mt-1 h-1 w-full rounded-full" style={{ background: p.muted + "55" }} />
            <div className="mt-1 h-1 w-2/3 rounded-full" style={{ background: p.muted + "55" }} />
          </div>
        ))}
      </div>
      <div className="mt-4 inline-block px-3.5 py-1.5 text-[9px] font-extrabold uppercase" style={{ background: p.accent, color: p.bg }}>
        Start now ↗
      </div>
    </div>,
  );
}

export default function ConceptCard({ c, brand, tagline, domain, onApply }: { c: DesignConcept; brand: string; tagline: string; domain: string; onApply?: (prompt: string) => void }) {
  const designPrompt = `Redesign the homepage of "${domain}" in the "${c.name}" direction.\nPalette: background ${c.palette.bg}, surface ${c.palette.surface}, text ${c.palette.text}, accent ${c.palette.accent}.\nDirection: ${c.rationale}\nApply these changes:\n${c.changes.map((x) => `- ${x}`).join("\n")}\nKeep all existing content and functionality; output production HTML/CSS.`;
  return (
    <div className="flex flex-col rounded-lg border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <div className="font-display text-[14px] font-bold">{c.name}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {[c.palette.bg, c.palette.surface, c.palette.text, c.palette.accent].map((col, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-sm border border-line2" style={{ background: col }} title={col} />
            ))}
            <span className="font-data ml-1 text-[10px] text-faint">{c.palette.accent}</span>
          </div>
        </div>
        <CopyButton text={designPrompt} label="Design prompt" />
      </div>
      <div className="p-4">
        <MiniHero c={c} brand={brand} tagline={tagline} domain={domain} />
      </div>
      <div className="border-t border-line px-4 py-3.5">
        <p className="text-[12px] leading-relaxed text-mut">{c.rationale}</p>
        <ul className="mt-2.5 space-y-1.5">
          {c.changes.map((ch) => (
            <li key={ch} className="flex gap-2 text-[12px] leading-snug text-ink/85">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-acc" />
              {ch}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-line px-4 py-3">
        <button
          onClick={() => onApply?.(designPrompt)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-acc px-3 py-2 text-[12px] font-bold text-acctext transition-colors hover:bg-accdeep disabled:opacity-50"
          disabled={!onApply}
        >
          <Sparkles className="h-3.5 w-3.5" /> Apply with copilot
        </button>
      </div>
    </div>
  );
}
