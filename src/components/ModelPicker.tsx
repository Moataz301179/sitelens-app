"use client";

import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface FreeModel {
  id: string;
  name?: string;
  context?: number | null;
  description?: string;
}

/**
 * ModelPicker — searchable combobox of FREE OpenRouter models, fetched live from
 * /api/providers/models. No embedded presets: the full free list is shown and any
 * custom model id can still be typed.
 */
export default function ModelPicker({
  value,
  onChange,
  placeholder,
  compact,
}: {
  value: string;
  onChange: (m: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [models, setModels] = useState<FreeModel[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/providers/models");
        const data = (await res.json()) as { models?: FreeModel[] };
        if (active) setModels(data.models ?? []);
      } catch {
        if (active) setModels([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!models) return [];
    if (!q) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q));
  }, [models, query]);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          value={open ? query : value}
          onFocus={() => {
            setOpen(true);
            setQuery(value);
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange((e.target as HTMLInputElement).value.trim());
              setOpen(false);
            }
          }}
          placeholder={placeholder ?? "Pick a free model or type an id…"}
          className={`w-full rounded-md border border-line2 bg-bg font-data text-[12.5px] text-ink placeholder:text-faint focus:border-acc/60 focus:outline-none ${
            compact ? "px-2 py-1 pl-7" : "px-3 py-2.5 pl-9"
          }`}
          spellCheck={false}
          autoComplete="off"
        />
        {loading && <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-faint" />}
      </div>
      {open && (
        <div className="absolute z-40 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-md border border-line2 bg-panel shadow-2xl">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-mut">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-acc" /> Loading free models…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-mut">No free models match — keep typing a custom id.</div>
          ) : (
            filtered.slice(0, 60).map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(m.id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${value === m.id ? "bg-acc/10" : "hover:bg-panel2"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-data text-[12px] font-bold text-ink">{m.id}</div>
                  {m.name && m.name !== m.id && <div className="truncate text-[11px] text-mut">{m.name}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.context ? (
                    <span className="rounded bg-panel3 px-1.5 py-0.5 font-data text-[9.5px] text-faint">{Math.round(m.context / 1000)}k ctx</span>
                  ) : null}
                  <span className="rounded bg-ok/15 px-1.5 py-0.5 font-data text-[9.5px] font-bold text-ok">free</span>
                  {value === m.id && <Check className="h-3.5 w-3.5 text-acc" />}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
