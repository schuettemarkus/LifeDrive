"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { areaColor, SPRING } from "@/lib/design";
import type { Habit, HabitCompletion } from "@/types/database";

type Props = {
  habits: Habit[];
  completions: HabitCompletion[];
};

const TIME_LABEL: Record<string, string> = {
  morning: "morning",
  midday: "midday",
  evening: "evening",
  anytime: "anytime",
};

export function TodaysHabits({ habits, completions }: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const c of completions) map[c.habit_id] = true;
    return map;
  });

  if (habits.length === 0) return <EmptyState />;

  async function toggle(habit: Habit) {
    const wasDone = !!optimistic[habit.id];
    setOptimistic((m) => ({ ...m, [habit.id]: !wasDone }));
    try {
      await fetch(`/api/habits/${habit.id}/complete`, {
        method: wasDone ? "DELETE" : "POST",
      });
      if (!wasDone) {
        // Habit completion may trigger a streak — re-rank to surface a quick-win
        // and re-balance area weights.
        void fetch("/api/prioritize?persist=true", { method: "GET" });
      }
    } catch {
      // revert on failure
      setOptimistic((m) => ({ ...m, [habit.id]: wasDone }));
    } finally {
      router.refresh();
    }
  }

  const sortedByDone = [...habits].sort((a, b) => {
    const ad = optimistic[a.id] ? 1 : 0;
    const bd = optimistic[b.id] ? 1 : 0;
    if (ad !== bd) return ad - bd; // not-done first
    return a.position - b.position;
  });

  const doneCount = habits.filter((h) => optimistic[h.id]).length;

  return (
    <section className="px-4">
      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
          <Repeat className="h-3.5 w-3.5" />
          daily habits
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <span className="tabular-nums">
            {doneCount}/{habits.length}
          </span>
          <Link
            href="/habits"
            className="rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-white/70"
          >
            manage
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sortedByDone.map((habit) => {
            const done = !!optimistic[habit.id];
            const c = areaColor(habit.life_area);
            return (
              <motion.button
                key={habit.id}
                layout
                transition={SPRING}
                whileTap={{ scale: 0.985 }}
                onClick={() => toggle(habit)}
                className="w-full text-left"
              >
                <GlassCard
                  inset
                  variant={done ? "subtle" : "default"}
                  className="flex items-center gap-3 transition-opacity"
                  style={{ opacity: done ? 0.55 : 1 }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base"
                    style={{
                      borderColor: done ? "transparent" : `${c}66`,
                      background: done
                        ? "linear-gradient(135deg,#7C5CFF,#00D4FF)"
                        : `${c}1F`,
                    }}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : habit.icon ? (
                      <span aria-hidden>{habit.icon}</span>
                    ) : (
                      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[14px] font-medium ${done ? "line-through text-white/55" : "text-white/95"}`}
                    >
                      {habit.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {habit.life_area && <AreaPill area={habit.life_area} size="xs" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        {TIME_LABEL[habit.time_of_day] ?? "anytime"}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="px-4">
      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
          <Repeat className="h-3.5 w-3.5" />
          daily habits
        </h2>
        <Link
          href="/habits/new"
          className="flex items-center gap-1 rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
        >
          <Plus className="h-3 w-3" /> add
        </Link>
      </div>
      <GlassCard inset variant="subtle">
        <p className="text-sm text-white/65">
          Stack a few rituals here. Morning stretch, 10 min reading, 8 glasses of water. Tap to complete.
        </p>
        <Link
          href="/habits/new"
          className="mt-3 inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          add your first habit
        </Link>
      </GlassCard>
    </section>
  );
}
