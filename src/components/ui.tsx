"use client";

import { Check, Copy, KeyRound, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Severity } from "@/lib/types";

/* ---------- brand ---------- */

export function Brand({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-panel3" />
        <circle cx="14.5" cy="14.5" r="7" fill="none" stroke="var(--color-acc)" strokeWidth="2.6" />
        <line x1="19.8" y1="19.8" x2="25.5" y2="25.5" stroke="var(--color-acc)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="14.5" cy="14.5" r="2.1" fill="var(--color-acc)" />
      </svg>
      <span className="font-display text-[17px] font-bold tracking-tight">
        Site<span className="text-acc">Lens</span>
      </span>
    </span>
  );
}

/* ---------- primitives ---------- */

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border border-line bg-panel ${className}`}>{children}</div>;
}

export function SectionTitle({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="font-data text-[11px] uppercase tracking-[0.14em] text-acc">{kicker}</div>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

const SEV_STYLE: Record<Severity, string> = {
  critical: "bg-bad/15 text-bad border-bad/30",
  warning: "bg-warn/12 text-warn border-warn/30",
  info: "bg-info/12 text-info border-info/30",
  pass: "bg-ok/12 text-ok border-ok/30",
};

export function SevBadge({ sev }: { sev: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-data text-[10.5px] font-semibold uppercase tracking-wide ${SEV_STYLE[sev]}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {sev}
    </span>
  );
}

export function Chip({ children, tone = "mut" }: { children: ReactNode; tone?: "mut" | "acc" | "ok" | "warn" | "bad" }) {
  const tones = {
    mut: "border-line2 bg-panel2 text-mut",
    acc: "border-acc/30 bg-acc/10 text-acc",
    ok: "border-ok/30 bg-ok/10 text-ok",
    warn: "border-warn/30 bg-warn/10 text-warn",
    bad: "border-bad/30 bg-bad/10 text-bad",
  };
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11.5px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  kind = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "outline";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const kinds = {
    primary: "bg-acc text-acctext hover:bg-accdeep font-bold",
    ghost: "bg-transparent text-mut hover:text-ink hover:bg-panel2",
    outline: "border border-line2 bg-panel2 text-ink hover:border-acc/50 hover:text-acc",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${kinds[kind]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin-slow ${className}`} />;
}

/* ---------- copy ---------- */

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        copied ? "border-ok/40 bg-ok/10 text-ok" : "border-line2 bg-panel2 text-mut hover:border-acc/50 hover:text-acc"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ---------- modal ---------- */

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/65 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className={`w-full ${width} animate-fade-up rounded-xl border border-line2 bg-panel shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="font-display text-[15px] font-bold">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-mut hover:bg-panel2 hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */

interface ToastMsg {
  id: number;
  text: string;
  kind: "ok" | "bad" | "mut";
}

export function toast(text: string, kind: ToastMsg["kind"] = "mut") {
  window.dispatchEvent(new CustomEvent("sl-toast", { detail: { text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { text, kind } = (e as CustomEvent).detail as { text: string; kind: ToastMsg["kind"] };
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, text, kind }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
    };
    window.addEventListener("sl-toast", onToast);
    return () => window.removeEventListener("sl-toast", onToast);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[320px] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-up pointer-events-auto rounded-md border px-3.5 py-2.5 text-[13px] font-semibold shadow-xl ${
            t.kind === "ok" ? "border-ok/40 bg-[#122019] text-ok" : t.kind === "bad" ? "border-bad/40 bg-[#241516] text-bad" : "border-line2 bg-panel2 text-ink"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- key status pill ---------- */

export function KeyPill({ hasKey, onClick }: { hasKey: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        hasKey ? "border-acc/40 bg-acc/10 text-acc hover:bg-acc/15" : "border-line2 bg-panel2 text-mut hover:text-ink"
      }`}
    >
      <KeyRound className="h-3.5 w-3.5" />
      {hasKey ? "AI key set" : "Add AI key"}
    </button>
  );
}

/* ---------- score dial ---------- */

export function scoreTone(v: number): { color: string; label: string } {
  if (v >= 80) return { color: "var(--color-ok)", label: "Strong" };
  if (v >= 60) return { color: "var(--color-acc)", label: "Fair" };
  if (v >= 40) return { color: "var(--color-warn)", label: "At risk" };
  return { color: "var(--color-bad)", label: "Critical" };
}

export function ScoreDial({ value, label, size = 92, stroke = 7, showLabel = true }: { value: number; label?: string; size?: number; stroke?: number; showLabel?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { color, label: tone } = scoreTone(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (Math.max(0, Math.min(100, value)) / 100) * c}
            className="dial-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data text-xl font-bold leading-none" style={{ color }}>
            {Math.round(value)}
          </span>
          <span className="font-data mt-0.5 text-[9px] uppercase text-faint">/100</span>
        </div>
      </div>
      {showLabel && label && (
        <div className="text-center">
          <div className="text-[11.5px] font-bold text-mut">{label}</div>
          <div className="font-data text-[10px] uppercase tracking-wide" style={{ color }}>
            {tone}
          </div>
        </div>
      )}
    </div>
  );
}

export function useAnimatedNumber(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  const animate = useCallback(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, ms]);
  useEffect(() => {
    animate();
  }, [animate]);
  return v;
}
