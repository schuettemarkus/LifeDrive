"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Check } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { formatMinutes } from "@/lib/utils";
import type { LifeAreaKey } from "@/lib/design";

type TriagedItem = {
  title: string;
  notes?: string | null;
  life_area: LifeAreaKey | null;
  type: "task" | "project";
  effort_minutes: number;
  urgency: number;
  impact?: number;
  suggested_due_date?: string | null;
  is_next_action?: boolean;
};

export function CaptureForm({ initial }: { initial?: string }) {
  const [raw, setRaw] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<TriagedItem[] | null>(null);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  async function triage() {
    if (!raw.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: raw }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Triage failed");
      setItems(j.items ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!items?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: raw, commit: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setCommitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleVoice() {
    const w = typeof window !== "undefined" ? (window as any) : null;
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice not supported in this browser. Try iOS Safari or Chrome.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += e.results[i][0].transcript;
      }
      setRaw((prev) => (prev ? `${prev}\n${chunk}`.trim() : chunk));
    };
    r.onend = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  }

  function reset() {
    setRaw("");
    setItems(null);
    setCommitted(false);
    setError(null);
  }

  return (
    <section className="px-4 pt-5 pb-32 space-y-3">
      <AnimatePresence mode="wait" initial={false}>
        {committed ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset variant="strong" className="grid place-items-center gap-2 py-8 text-center">
              <Check className="h-8 w-8 text-emerald-300" />
              <p className="text-base font-semibold text-white">Sorted & resting.</p>
              <p className="text-xs text-white/55">
                {items?.length} items dropped into your inbox.
              </p>
              <button
                onClick={reset}
                className="mt-3 rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                drop more
              </button>
            </GlassCard>
          </motion.div>
        ) : items ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-white/55">
              {items.length} item{items.length === 1 ? "" : "s"} sorted. Tap save when this looks right.
            </p>
            {items.map((it, i) => (
              <GlassCard key={i} inset>
                <div className="flex items-center gap-2">
                  <AreaPill area={it.life_area} size="xs" />
                  <span className="rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/65">
                    {it.type}
                  </span>
                  <span className="text-[11px] text-white/50">{formatMinutes(it.effort_minutes)}</span>
                  <span className="ml-auto text-[10px] text-white/40">urg {it.urgency}</span>
                </div>
                <p className="mt-1.5 text-[14px] font-medium text-white/90">{it.title}</p>
                {it.notes && <p className="mt-0.5 text-[11px] text-white/55">{it.notes}</p>}
              </GlassCard>
            ))}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setItems(null)}
                className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                edit
              </button>
              <button
                disabled={busy}
                onClick={commit}
                className="rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
              >
                {busy ? "saving…" : "save all"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dump"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="One thing per line. Anything. The AI sorts."
                rows={10}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
              />
            </GlassCard>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={toggleVoice}
                aria-pressed={listening}
                className={`flex items-center gap-2 rounded-pill border border-white/10 px-3 py-2 text-sm ${listening ? "bg-rose-500/20 text-rose-200" : "bg-white/5 text-white/80"}`}
              >
                <Mic className="h-4 w-4" />
                {listening ? "listening" : "voice"}
              </button>
              <button
                disabled={busy || !raw.trim()}
                onClick={triage}
                className="flex items-center gap-2 rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {busy ? "triaging…" : "triage"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="text-center text-xs text-red-300">{error}</p>}
    </section>
  );
}
