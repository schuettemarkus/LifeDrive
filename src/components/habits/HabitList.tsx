"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import type { Habit, HabitCompletion } from "@/types/database";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function frequencyLabel(days: number[]) {
  if (days.length === 7) return "daily";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "weekends";
  return days.sort().map((d) => DAY_LABELS[d]).join(" ");
}

export function HabitList({
  initialHabits,
  initialCompletions,
}: {
  initialHabits: Habit[];
  initialCompletions: HabitCompletion[];
}) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = useSearchParams();
  useEffect(() => {
    if (search?.get("add") === "1") setAdding(true);
  }, [search]);

  const completionStats = useMemo(() => {
    const byHabit: Record<string, { last7: number }> = {};
    for (const c of initialCompletions) {
      byHabit[c.habit_id] = byHabit[c.habit_id] ?? { last7: 0 };
      byHabit[c.habit_id].last7 += 1;
    }
    return byHabit;
  }, [initialCompletions]);

  async function create(values: HabitFormValues) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setHabits((prev) => [...prev, j.habit as Habit]);
      setAdding(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, values: HabitFormValues) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setHabits((prev) => prev.map((h) => (h.id === id ? (j.habit as Habit) : h)));
      setEditingId(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const ok = window.confirm("Delete this habit?");
    if (!ok) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  }

  async function toggleActive(habit: Habit) {
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, active: !h.active } : h)));
    await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !habit.active }),
    });
  }

  return (
    <section className="px-4 pt-5 pb-tabbar space-y-3">
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-accent-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow"
        >
          <Plus className="h-4 w-4" /> new habit
        </button>
      ) : (
        <GlassCard inset variant="strong">
          <HabitForm
            onCancel={() => setAdding(false)}
            onSubmit={create}
            busy={busy}
          />
        </GlassCard>
      )}

      {err && <p className="text-center text-xs text-red-300">{err}</p>}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {habits.length === 0 && (
            <GlassCard inset variant="subtle">
              <p className="text-sm text-white/65">
                No habits yet. Start with one — "10 minutes reading", "stretch after coffee".
                Pick the days you want to see it on the Drive.
              </p>
            </GlassCard>
          )}
          {habits.map((habit) => {
            const isEditing = editingId === habit.id;
            const stat = completionStats[habit.id]?.last7 ?? 0;
            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: habit.active ? 1 : 0.55, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard inset>
                  {isEditing ? (
                    <HabitForm
                      initial={{
                        title: habit.title,
                        notes: habit.notes ?? "",
                        life_area: (habit.life_area as any) ?? null,
                        days_of_week: habit.days_of_week,
                        time_of_day: habit.time_of_day,
                        icon: habit.icon ?? "",
                      }}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(values) => update(habit.id, values)}
                      busy={busy}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleActive(habit)}
                        className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                          habit.active ? "border-emerald-400/50 bg-emerald-400/15" : "border-white/15 bg-white/5"
                        }`}
                        aria-label={habit.active ? "Pause habit" : "Resume habit"}
                      >
                        {habit.icon ? (
                          <span aria-hidden className="text-sm">{habit.icon}</span>
                        ) : habit.active ? (
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-white/55" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-white/95">{habit.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {habit.life_area && <AreaPill area={habit.life_area} size="xs" />}
                          <span className="rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/65">
                            {frequencyLabel(habit.days_of_week)}
                          </span>
                          <span className="rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/65">
                            {habit.time_of_day}
                          </span>
                          <span className="text-[11px] text-white/45">
                            {stat}/7 this week
                          </span>
                        </div>
                        {habit.notes && (
                          <p className="mt-1 text-[12px] text-white/55">{habit.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => setEditingId(habit.id)}
                          aria-label="Edit"
                          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(habit.id)}
                          aria-label="Delete"
                          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/55 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
