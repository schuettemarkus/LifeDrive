"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { useRouter } from "next/navigation";
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

export function PlanDayButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [proposed, setProposed] = useState<Proposed[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function plan(scope: "day" | "week" = "day") {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calendar/plan?scope=${scope}`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Plan failed");
      setProposed(j.proposed ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!proposed?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calendar/plan/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ block_ids: proposed.map((p) => p.block_id) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Accept failed");
      setProposed(null);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        disabled={busy || disabled}
        onClick={() => plan("day")}
        className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        title={disabled ? "Connect Google Calendar first" : ""}
      >
        <Sparkles className="mr-1 inline h-4 w-4" />
        {busy ? "planning…" : "plan"}
      </button>
      <AnimatePresence>
        {proposed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl px-4 pb-32"
          >
            <div className="glass-surface-strong rounded-glass p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">proposed plan</p>
              <ul className="mt-2 space-y-1.5">
                {proposed.map((p) => (
                  <li
                    key={p.block_id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[13px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{p.title}</p>
                      <p className="text-[11px] text-white/50">
                        {new Date(p.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
                        → {new Date(p.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/45">{formatMinutes(p.effort_minutes)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setProposed(null)}
                  className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
                >
                  discard
                </button>
                <button
                  onClick={accept}
                  disabled={busy}
                  className="rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  <Check className="mr-1 inline h-4 w-4" />
                  {busy ? "writing…" : "accept & book"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {err && <p className="mt-1 text-[11px] text-red-300">{err}</p>}
    </div>
  );
}
