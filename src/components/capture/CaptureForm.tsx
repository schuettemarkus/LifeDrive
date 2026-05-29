"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
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
  status?: "inbox" | "backlog" | "this_week" | "doing";
};

const LANES: { value: TriagedItem["status"]; label: string }[] = [
  { value: "inbox", label: "inbox" },
  { value: "this_week", label: "this week" },
  { value: "backlog", label: "backlog" },
];

export function CaptureForm({ initial }: { initial?: string }) {
  const router = useRouter();
  const [raw, setRaw] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<TriagedItem[] | null>(null);
  const [committed, setCommitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
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
      const sorted = (j.items ?? []) as TriagedItem[];
      // Default high-urgency items into this_week, others into inbox.
      setItems(sorted.map((it) => ({ ...it, status: it.urgency >= 4 ? "this_week" : "inbox" })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function setLane(idx: number, lane: TriagedItem["status"]) {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === idx ? { ...it, status: lane } : it)) : prev,
    );
  }

  async function commit() {
    if (!items?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, commit: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setSavedCount(items.length);
      setCommitted(true);
      router.refresh();
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
    setSavedCount(0);
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
                {savedCount} item{savedCount === 1 ? "" : "s"} saved. Out of sight, in the queue.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={reset}
                  className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                >
                  drop more
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
                >
                  to the drive <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                </button>
              </div>
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
              {items.length} item{items.length === 1 ? "" : "s"} sorted. Tap a lane chip to move it. High urgency
              jumps to "this week" automatically.
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LANES.map((l) => {
                    const active = (it.status ?? "inbox") === l.value;
                    return (
                      <button
                        key={l.value}
                        onClick={() => setLane(i, l.value)}
                        className={`rounded-pill px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                          active
                            ? "bg-accent-gradient text-white shadow-glow"
                            : "border border-white/10 bg-white/5 text-white/55"
                        }`}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
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
