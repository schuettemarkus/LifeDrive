"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

export type SnoozeChoice =
  | { kind: "later_today" }
  | { kind: "tomorrow" }
  | { kind: "next_week" }
  | { kind: "weekend" }
  | { kind: "pick"; date: string /* YYYY-MM-DD */ };

const OPTIONS: { label: string; description: string; value: SnoozeChoice }[] = [
  { label: "later today", description: "stays on today's drive, bottom of the queue", value: { kind: "later_today" } },
  { label: "tomorrow", description: "vanishes today, picks up at 6am", value: { kind: "tomorrow" } },
  { label: "this weekend", description: "shows back up Saturday morning", value: { kind: "weekend" } },
  { label: "next week", description: "monday, top of the queue", value: { kind: "next_week" } },
];

export function SnoozePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (choice: SnoozeChoice) => void;
}) {
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-label="Snooze options"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl px-4 safe-bottom"
          >
            <div className="glass-surface-strong rounded-glass p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent-cyan" />
                  <p className="text-sm font-semibold text-white">Snooze until…</p>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5 text-white/70" />
                </button>
              </div>
              <div className="space-y-1.5">
                {OPTIONS.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => { onPick(o.value); onClose(); }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/10"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{o.label}</p>
                      <p className="text-[11px] text-white/50">{o.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">pick a date</p>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="flex-1 rounded-2xl border border-white/10 bg-canvas px-3 py-2 text-sm text-white focus:border-accent-violet focus:outline-none"
                  />
                  <button
                    disabled={!customDate}
                    onClick={() => { onPick({ kind: "pick", date: customDate }); onClose(); }}
                    className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                  >
                    set
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Convert a SnoozeChoice into a server payload (status + due_date). */
export function snoozeChoiceToPatch(choice: SnoozeChoice): {
  status?: "backlog" | "this_week" | "inbox" | "someday";
  due_date?: string | null;
  is_next_action?: boolean;
} {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  switch (choice.kind) {
    case "later_today": {
      // Demote from next-action but keep on this week.
      return { status: "this_week", is_next_action: false };
    }
    case "tomorrow":
      return { status: "this_week", due_date: fmt(tomorrow), is_next_action: false };
    case "weekend": {
      const sat = new Date(now);
      const offset = (6 - now.getDay() + 7) % 7 || 7;
      sat.setDate(now.getDate() + offset);
      return { status: "this_week", due_date: fmt(sat), is_next_action: false };
    }
    case "next_week": {
      const monday = new Date(now);
      const dow = now.getDay();
      const offset = ((1 - dow + 7) % 7) || 7;
      monday.setDate(now.getDate() + offset);
      return { status: "backlog", due_date: fmt(monday), is_next_action: false };
    }
    case "pick":
      return { status: "backlog", due_date: choice.date, is_next_action: false };
  }
}
