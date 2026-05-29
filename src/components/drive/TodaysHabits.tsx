"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Check, Plus, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { SwipeRow } from "@/components/glass/SwipeRow";
import { areaColor, SPRING } from "@/lib/design";
import { computeHabitStreak } from "@/lib/habit-streak";
import type { Habit, HabitCompletion } from "@/types/database";

type Props = {
  habits: Habit[];
  /** Last 30-60 days of completions for this user (any habit). Used for streaks + today's done state. */
  completions: HabitCompletion[];
  /** Today's date in user TZ (YYYY-MM-DD). Drives both "done today" and streak anchoring. */
  today: string;
};

const TIME_LABEL: Record<string, string> = {
  morning: "morning",
  midday: "midday",
  evening: "evening",
  anytime: "anytime",
};

export function TodaysHabits({ habits, completions, today }: Props) {
  const router = useRouter();

  const completedTodayInit = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const c of completions) {
      if (c.completed_on === today) m[c.habit_id] = true;
    }
    return m;
  }, [completions, today]);

  const [optimistic, setOptimistic] = useState<Record<string, boolean>>(completedTodayInit);

  const streaks = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of habits) {
      // Reflect the optimistic completion in the streak calc so it updates the
      // instant the user taps.
      const augmented =
        optimistic[h.id] && !completedTodayInit[h.id]
          ? [...completions, { habit_id: h.id, completed_on: today } as HabitCompletion]
          : !optimistic[h.id] && completedTodayInit[h.id]
            ? completions.filter((c) => !(c.habit_id === h.id && c.completed_on === today))
            : completions;
      m[h.id] = computeHabitStreak(h, augmented, today);
    }
    return m;
  }, [habits, completions, today, optimistic, completedTodayInit]);

  if (habits.length === 0) return <EmptyState />;

  async function toggle(habit: Habit) {
    const wasDone = !!optimistic[habit.id];
    setOptimistic((m) => ({ ...m, [habit.id]: !wasDone }));
    try {
      await fetch(`/api/habits/${habit.id}/complete`, {
        method: wasDone ? "DELETE" : "POST",
      });
    } catch {
      setOptimistic((m) => ({ ...m, [habit.id]: wasDone }));
    } finally {
      router.refresh();
    }
  }

  const sortedByDone = [...habits].sort((a, b) => {
    const ad = optimistic[a.id] ? 1 : 0;
    const bd = optimistic[b.id] ? 1 : 0;
    if (ad !== bd) return ad - bd;
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
            const streak = streaks[habit.id] ?? 0;
            return (
              <motion.div key={habit.id} layout transition={SPRING}>
                <SwipeRow
                  onComplete={() => {
                    if (!done) toggle(habit);
                  }}
                  onSnooze={() => {
                    if (done) toggle(habit);
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => toggle(habit)}
                    className="w-full text-left"
                  >
                    <GlassCard
                      inset
                      variant={done ? "subtle" : "default"}
                      className="flex items-center gap-3 transition-opacity"
                      style={{ opacity: done ? 0.65 : 1 }}
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
                          className={`truncate text-[14px] font-medium ${
                            done ? "line-through text-white/55" : "text-white/95"
                          }`}
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
                      {streak > 0 && (
                        <span
                          className={`flex shrink-0 items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                            streak >= 7
                              ? "border-orange-400/50 bg-orange-400/15 text-orange-200"
                              : "border-white/15 bg-white/5 text-white/75"
                          }`}
                          title={`${streak}-day streak`}
                        >
                          <Flame
                            className={`h-3 w-3 ${streak >= 7 ? "text-orange-300" : "text-white/55"}`}
                          />
                          {streak}
                        </span>
                      )}
                    </GlassCard>
                  </motion.button>
                </SwipeRow>
              </motion.div>
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
