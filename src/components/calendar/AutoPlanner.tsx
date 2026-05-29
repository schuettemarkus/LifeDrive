"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { formatMinutes } from "@/lib/utils";

type Proposed = {
  block_id: string;
  item_id: string;
  title: string;
  area: string | null;
  start: string;
  end: string;
  effort_minutes: number;
};

function fmt(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Runs /api/calendar/plan on mount to auto-propose blocks for the locked top
 * 3 focus items, then renders the proposals *inline* below the calendar.
 * Accept writes real Google events; refresh re-runs the planner.
 *
 * No button to trigger the plan — calendar tab implies "show me my day".
 */
export function AutoPlanner({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [proposed, setProposed] = useState<Proposed[] | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [accepting, setAccepting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<number | null>(null);

  async function plan() {
    if (!enabled) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calendar/plan?scope=day`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Plan failed");
      setProposed((j.proposed ?? []) as Proposed[]);
      setAccepted(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    void plan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function accept() {
    if (!proposed?.length) return;
    setAccepting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calendar/plan/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ block_ids: proposed.map((p) => p.block_id) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Accept failed");
      setAccepted(j.accepted ?? proposed.length);
      setProposed(null);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAccepting(false);
    }
  }

  if (!enabled) return null;

  return (
    <section className="px-4 pt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
          <Sparkles className="h-3.5 w-3.5" />
          auto plan · today's 3 focus tasks
        </h2>
        <button
          onClick={() => void plan()}
          disabled={loading}
          className="flex items-center gap-1 rounded-pill border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 disabled:opacity-50"
          aria-label="Re-plan day"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          re-plan
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset variant="subtle">
              <p className="animate-pulse text-sm text-white/55">
                finding open windows for your focus tasks…
              </p>
            </GlassCard>
          </motion.div>
        ) : err ? (
          <motion.div
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset variant="subtle">
              <p className="text-sm text-red-300">{err}</p>
            </GlassCard>
          </motion.div>
        ) : proposed && proposed.length > 0 ? (
          <motion.div
            key="proposals"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset variant="strong" className="space-y-3">
              <p className="text-sm text-white/80">
                Here's a draft plan for today. Tap accept to book these on your Google Calendar.
              </p>
              <ul className="space-y-2">
                {proposed.map((p) => (
                  <li
                    key={p.block_id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-white/95">{p.title}</p>
                      <p className="text-[11px] tabular-nums text-white/55">
                        {fmt(p.start)} → {fmt(p.end)} · {formatMinutes(p.effort_minutes)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setProposed(null)}
                  className="rounded-pill border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/80"
                >
                  not now
                </button>
                <button
                  onClick={accept}
                  disabled={accepting}
                  className="flex items-center gap-1 rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {accepting ? "booking…" : "accept & book"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard inset variant="subtle">
              <p className="text-sm text-white/70">
                {accepted !== null
                  ? `Booked ${accepted} block${accepted === 1 ? "" : "s"} on your calendar.`
                  : "Today's focus tasks are already on your calendar."}
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
