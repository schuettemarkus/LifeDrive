"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { GlassCard } from "@/components/glass/GlassCard";
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
  const [logs, setLogs] = useState<MovementLog[]>(initialLogs);
  const [busyKind, setBusyKind] = useState<MovementKind | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Aggregate the streak hint per kind so users see they're building a pattern.
  const countByKind = useMemo(() => {
    const map = new Map<MovementKind, number>();
    for (const l of logs) map.set(l.kind, (map.get(l.kind) ?? 0) + 1);
    return map;
  }, [logs]);

  const doneToday = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    return new Set(logs.filter((l) => l.day === day).map((l) => l.kind));
  }, [logs]);

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyKind(null);
    }
  }

  function pick(opt: Option) {
    if (opt.kind === "other") {
      setCustomOpen(true);
      return;
    }
    void log(opt.kind);
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

      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none"
        style={{ scrollPaddingInline: 16 }}
      >
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          const done = doneToday.has(opt.kind);
          const count = countByKind.get(opt.kind) ?? 0;
          return (
            <motion.button
              key={opt.kind}
              whileTap={{ scale: 0.96 }}
              onClick={() => pick(opt)}
              disabled={busyKind === opt.kind}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * i }}
              className={`relative snap-start shrink-0 grow-0 basis-[44%] rounded-glass border p-4 text-left transition-colors ${
                done
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
              }`}
            >
              {done && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-400/90 text-black">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <Icon className={`h-6 w-6 ${done ? "text-emerald-300" : "text-white/85"}`} />
              <p className="mt-3 text-[15px] font-semibold tracking-tight text-white">{opt.label}</p>
              <p className="mt-0.5 text-[11px] text-white/45">{opt.hint}</p>
              {count > 0 && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-white/35">
                  {count}× in 30 days
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/30">
        swipe to scroll · tap to log
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
