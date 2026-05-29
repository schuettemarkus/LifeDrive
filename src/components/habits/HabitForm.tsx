"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { LIFE_AREAS, LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";
import type { HabitTimeOfDay } from "@/types/database";

export type HabitFormValues = {
  title: string;
  notes?: string;
  life_area: LifeAreaKey | null;
  days_of_week: number[];
  time_of_day: HabitTimeOfDay;
  icon?: string;
};

const DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

const PRESETS: { label: string; days: number[] }[] = [
  { label: "every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "weekdays", days: [1, 2, 3, 4, 5] },
  { label: "weekends", days: [0, 6] },
  { label: "M·W·F", days: [1, 3, 5] },
  { label: "T·Th", days: [2, 4] },
];

const TIMES: { value: HabitTimeOfDay; label: string }[] = [
  { value: "morning", label: "morning" },
  { value: "midday", label: "midday" },
  { value: "evening", label: "evening" },
  { value: "anytime", label: "anytime" },
];

const ICON_SUGGESTIONS = ["🌿", "💧", "📚", "🧘", "🏋️", "🥗", "🚶", "✍️", "🛏️", "🧠"];

export function HabitForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Partial<HabitFormValues>;
  onSubmit: (values: HabitFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lifeArea, setLifeArea] = useState<LifeAreaKey | null>(
    (initial?.life_area as LifeAreaKey) ?? null,
  );
  const [days, setDays] = useState<number[]>(initial?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>(initial?.time_of_day ?? "anytime");
  const [icon, setIcon] = useState(initial?.icon ?? "");

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || days.length === 0) return;
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || undefined,
      life_area: lifeArea,
      days_of_week: days,
      time_of_day: timeOfDay,
      icon: icon || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's the habit?"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-accent-violet focus:outline-none"
        required
      />

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">days</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => {
            const active =
              p.days.length === days.length && p.days.every((d) => days.includes(d));
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setDays(p.days)}
                className={`rounded-pill px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                  active
                    ? "bg-accent-gradient text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-white/65"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {DAYS.map((d) => {
            const active = days.includes(d.value);
            return (
              <button
                key={`${d.value}-${d.label}`}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-accent-gradient text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-white/65"
                }`}
                aria-pressed={active}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">time</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMES.map((t) => {
            const active = timeOfDay === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeOfDay(t.value)}
                className={`rounded-pill px-3 py-1 text-[11px] ${
                  active
                    ? "bg-accent-gradient text-white shadow-glow"
                    : "border border-white/10 bg-white/5 text-white/65"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">area (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLifeArea(null)}
            className={`rounded-pill px-3 py-1 text-[11px] ${
              lifeArea === null
                ? "border border-white/15 bg-white/10 text-white"
                : "border border-white/10 bg-white/5 text-white/55"
            }`}
          >
            none
          </button>
          {LIFE_AREA_KEYS.map((k) => {
            const active = lifeArea === k;
            const c = LIFE_AREAS[k].color;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setLifeArea(k)}
                className="rounded-pill px-3 py-1 text-[11px]"
                style={{
                  background: active ? `${c}33` : `${c}1F`,
                  border: `1px solid ${active ? c : `${c}44`}`,
                  color: c,
                }}
              >
                {LIFE_AREAS[k].name.toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">icon (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setIcon("")}
            className={`grid h-8 w-8 place-items-center rounded-full text-xs ${
              icon === "" ? "border border-white/15 bg-white/10 text-white" : "border border-white/10 bg-white/5 text-white/40"
            }`}
            aria-label="No icon"
          >
            —
          </button>
          {ICON_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setIcon(s)}
              className={`grid h-8 w-8 place-items-center rounded-full text-base ${
                icon === s ? "border border-accent-violet/60 bg-accent-violet/10" : "border border-white/10 bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes — what 'done' looks like, why it matters."
        rows={2}
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-accent-violet focus:outline-none"
      />

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-pill border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
        >
          <X className="h-3.5 w-3.5" /> cancel
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim() || days.length === 0}
          className="flex items-center gap-1 rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          {busy ? "saving…" : "save"}
        </button>
      </div>
    </form>
  );
}
