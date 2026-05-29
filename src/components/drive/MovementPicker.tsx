"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Activity,
  Heart,
  Footprints,
  Trees,
  Bike,
  CircleDot,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { SwipeRow } from "@/components/glass/SwipeRow";
import { Celebration } from "@/components/glass/Celebration";
import type { MovementKind, MovementLog } from "@/types/database";

type Option = {
  kind: MovementKind;
  label: string;
  icon: typeof Dumbbell;
  hint: string;
};

const OPTIONS: Option[] = [
  { kind: "workout", label: "Workout", icon: Dumbbell, hint: "strength or split" },
  { kind: "pickleball", label: "Pickleball", icon: Activity, hint: "court time" },
  { kind: "stretch", label: "Stretch", icon: Heart, hint: "mobility / yoga" },
  { kind: "walk", label: "Walk", icon: Footprints, hint: "easy steps" },
  { kind: "yard_work", label: "Yard Work", icon: Trees, hint: "outside hands-on" },
  { kind: "bike", label: "Bike", icon: Bike, hint: "ride or spin" },
  { kind: "other", label: "Other", icon: CircleDot, hint: "you name it" },
];

export function MovementPicker({
  initialLogs,
}: {
  initialLogs: MovementLog[];
}) {
  const router = useRouter();
  const [logs, setLogs] = useState<MovementLog[]>(initialLogs);
  const [busyKind, setBusyKind] = useState<MovementKind | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<MovementKind>>(new Set());

  const countByKind = useMemo(() => {
    const map = new Map<MovementKind, number>();
    for (const l of logs) map.set(l.kind, (map.get(l.kind) ?? 0) + 1);
    return map;
  }, [logs]);

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = useMemo(() => {
    return new Set(logs.filter((l) => l.day === today).map((l) => l.kind));
  }, [logs, today]);

  async function log(kind: MovementKind, custom?: string) {
    setBusyKind(kind);
    setError(null);
    try {
      const res = await fetch("/api/movement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, custom_label: custom ?? null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setLogs((prev) => [j.log as MovementLog, ...prev]);
      setCelebrate((n) => n + 1);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyKind(null);
    }
  }

  function pick(kind: MovementKind) {
    if (kind === "other") {
      setCustomOpen(true);
      return;
    }
    void log(kind);
  }

  function dismiss(kind: MovementKind) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
  }

  function submitCustom() {
    const text = customText.trim();
    if (!text) {
      setCustomOpen(false);
      return;
    }
    void log("other", text);
    setCustomText("");
    setCustomOpen(false);
  }

  // Order: not-done first (in their declared order), then done.
  const sorted = [...OPTIONS]
    .filter((o) => !hidden.has(o.kind))
    .sort((a, b) => {
      const ad = doneToday.has(a.kind) ? 1 : 0;
      const bd = doneToday.has(b.kind) ? 1 : 0;
      return ad - bd;
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-28 px-4"
    >
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <Dumbbell className="h-3.5 w-3.5" />
        today's movement
      </h2>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.map((opt, i) => {
            const Icon = opt.icon;
            const done = doneToday.has(opt.kind);
            const count = countByKind.get(opt.kind) ?? 0;
            return (
              <motion.div
                key={opt.kind}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, delay: 0.04 * i }}
              >
                <SwipeRow
                  onComplete={() => {
                    if (!done) pick(opt.kind);
                  }}
                  onSnooze={() => dismiss(opt.kind)}
                >
                  <div className="w-full text-left">
                    <GlassCard
                      inset
                      variant={done ? "subtle" : "default"}
                      className="flex items-center gap-3"
                      style={{ opacity: done ? 0.65 : 1 }}
                    >
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border"
                        style={{
                          borderColor: done ? "transparent" : "rgba(255,255,255,0.18)",
                          background: done
                            ? "linear-gradient(135deg,#7C5CFF,#00D4FF)"
                            : "rgba(255,255,255,0.05)",
                        }}
                      >
                        {done ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <Icon className="h-5 w-5 text-white/85" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[15px] font-semibold ${
                            done ? "text-white/55 line-through" : "text-white/95"
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/45">{opt.hint}</p>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 rounded-pill border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/65">
                          {count}× / 30d
                        </span>
                      )}
                    </GlassCard>
                  </div>
                </SwipeRow>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
        swipe right → log it · swipe left → not today
      </p>

      <AnimatePresence>
        {customOpen && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="mt-3"
          >
            <GlassCard inset>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                what was it?
              </p>
              <input
                autoFocus
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCustom();
                  if (e.key === "Escape") setCustomOpen(false);
                }}
                placeholder="e.g. paddleboarding"
                className="mt-1 w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setCustomOpen(false)}
                  className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"
                >
                  cancel
                </button>
                <button
                  onClick={submitCustom}
                  className="rounded-pill bg-accent-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-glow"
                >
                  log it
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

      <Celebration trigger={celebrate} />
    </motion.section>
  );
}
