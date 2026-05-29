"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Quote } from "lucide-react";
import { AreaPill } from "@/components/glass/AreaPill";
import { areaColor, type LifeAreaKey } from "@/lib/design";
import { shortDate, timeOfDay } from "@/lib/utils";

const STORAGE_KEY = "lifedrive:briefing:lastShown";

type FocusPreview = {
  id: string;
  title: string;
  area: LifeAreaKey | string | null;
};

export function MorningBriefing({
  name,
  principle,
  focusItems,
  habitsCount,
  workoutName,
}: {
  name: string;
  principle?: { text: string; group: string | null } | null;
  focusItems: FocusPreview[];
  habitsCount: number;
  workoutName?: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastShown = window.localStorage.getItem(STORAGE_KEY);
    if (lastShown === todayKey) return;
    // Only show if we have anything to brief on.
    if (!principle && focusItems.length === 0 && habitsCount === 0 && !workoutName) return;
    // Don't ambush a hard reload in the middle of the day. Only auto-open before 11am local.
    const hour = new Date().getHours();
    if (hour > 11) return;
    setOpen(true);
  }, [principle, focusItems.length, habitsCount, workoutName]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
    }
    setOpen(false);
  }

  const greet =
    timeOfDay() === "Late night"
      ? "Up early?"
      : timeOfDay() === "Good morning"
        ? "Good morning"
        : `${timeOfDay()}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[60] overflow-y-auto bg-canvas"
          role="dialog"
          aria-label="Morning briefing"
        >
          {/* Layered mesh background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 50% at 30% 10%, rgba(124,92,255,0.25) 0%, transparent 60%), radial-gradient(50% 40% at 80% 80%, rgba(0,212,255,0.18) 0%, transparent 60%)",
            }}
          />
          <div className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-between px-5 pt-10 pb-10 safe-bottom">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="text-sm text-white/55"
              >
                {greet}, {name}.
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="mt-1 text-[32px] font-semibold leading-tight tracking-tight text-balance text-white"
              >
                {shortDate(new Date())}
              </motion.h1>

              {principle && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-8 rounded-glass border border-white/10 bg-white/[0.04] p-5"
                >
                  <Quote className="h-5 w-5 text-white/35" />
                  <p className="mt-2 text-[19px] leading-snug text-balance text-white/95">
                    {principle.text}
                  </p>
                  {principle.group && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {principle.group.replace(/_/g, " ")}
                    </p>
                  )}
                </motion.div>
              )}

              {focusItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mt-6 space-y-2.5"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">today's three</p>
                  {focusItems.map((it, i) => (
                    <div
                      key={it.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      style={{ boxShadow: `inset 0 0 0 1px ${areaColor(it.area)}33` }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/85"
                          style={{ background: `${areaColor(it.area)}33` }}
                        >
                          {i + 1}
                        </span>
                        <AreaPill area={it.area} size="xs" />
                      </div>
                      <p className="mt-2 text-[15.5px] font-medium leading-snug text-white/95">{it.title}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {(habitsCount > 0 || workoutName) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  {habitsCount > 0 && (
                    <span className="rounded-pill border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 text-[12px] text-accent-cyan">
                      {habitsCount} habit{habitsCount === 1 ? "" : "s"} to keep
                    </span>
                  )}
                  {workoutName && (
                    <span className="rounded-pill border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[12px] text-emerald-300">
                      {workoutName} day
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-10 grid place-items-center gap-2"
            >
              <button
                onClick={dismiss}
                className="flex items-center gap-2 rounded-pill bg-accent-gradient px-7 py-3 text-sm font-semibold text-white shadow-glow"
              >
                let's go
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={dismiss}
                className="text-[11px] uppercase tracking-wider text-white/40"
              >
                skip for today
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
