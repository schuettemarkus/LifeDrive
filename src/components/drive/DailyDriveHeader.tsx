"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Target, Repeat, Dumbbell, Quote } from "lucide-react";
import { shortDate, timeOfDay } from "@/lib/utils";

export type TodayCounts = {
  focusTotal: number;
  focusDone: number;
  habitsTotal: number;
  habitsDone: number;
  hasWorkout: boolean;
  workoutDone: boolean;
  hasPrinciple: boolean;
};

export function DailyDriveHeader({
  streak,
  streakActiveToday,
  name,
  resting,
  signedIn,
  counts,
}: {
  streak: number;
  streakActiveToday?: boolean;
  name: string;
  resting: number;
  signedIn?: boolean;
  counts?: TodayCounts;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <header className="px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-white/55"
          >
            {timeOfDay()}, {name}.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-balance"
          >
            {shortDate(new Date())}
          </motion.h1>
        </div>
        {signedIn ? (
          <Link
            href="/settings"
            aria-label="Settings"
            className="no-tap-highlight grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/85"
          >
            {initial}
          </Link>
        ) : (
          <Link
            href="/auth/sign-in"
            className="no-tap-highlight shrink-0 rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80"
          >
            sign in
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-pill border px-2.5 py-1 ${
            streak > 0 && streakActiveToday
              ? "border-amber-300/30 bg-amber-300/15 text-amber-200"
              : streak > 0
                ? "border-amber-300/20 bg-amber-300/10 text-amber-200/80"
                : "border-white/10 bg-white/5 text-white/55"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold tabular-nums">
            {streak}-day streak
          </span>
        </div>
        <span className="text-xs text-white/40">{resting} resting</span>
      </div>

      {counts && <TodayPill counts={counts} />}
    </header>
  );
}

function TodayPill({ counts }: { counts: TodayCounts }) {
  const chips: { label: string; done: boolean; icon: React.ReactNode; tone: string }[] = [];
  if (counts.focusTotal > 0) {
    chips.push({
      label: `${counts.focusDone}/${counts.focusTotal} focus`,
      done: counts.focusDone === counts.focusTotal,
      icon: <Target className="h-3 w-3" />,
      tone: "violet",
    });
  }
  if (counts.habitsTotal > 0) {
    chips.push({
      label: `${counts.habitsDone}/${counts.habitsTotal} habits`,
      done: counts.habitsDone === counts.habitsTotal,
      icon: <Repeat className="h-3 w-3" />,
      tone: "cyan",
    });
  }
  if (counts.hasWorkout) {
    chips.push({
      label: counts.workoutDone ? "workout" : "workout",
      done: counts.workoutDone,
      icon: <Dumbbell className="h-3 w-3" />,
      tone: "emerald",
    });
  }
  if (counts.hasPrinciple) {
    chips.push({
      label: "principle",
      done: true,
      icon: <Quote className="h-3 w-3" />,
      tone: "rose",
    });
  }
  if (chips.length === 0) return null;

  const toneFor = (tone: string, done: boolean) => {
    if (!done) return "border-white/10 bg-white/5 text-white/60";
    switch (tone) {
      case "violet":
        return "border-accent-violet/30 bg-accent-violet/10 text-accent-violet";
      case "cyan":
        return "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan";
      case "emerald":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
      case "rose":
        return "border-rose-400/25 bg-rose-400/10 text-rose-300";
      default:
        return "border-white/10 bg-white/5 text-white/75";
    }
  };

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${toneFor(c.tone, c.done)}`}
        >
          {c.icon}
          <span>{c.label}</span>
        </span>
      ))}
    </div>
  );
}
