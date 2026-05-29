"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Target, Repeat, Dumbbell } from "lucide-react";

export type TodayCounts = {
  focusTotal: number;
  focusDone: number;
  habitsTotal: number;
  habitsDone: number;
  movementDone: number;
};

function fullDate(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DailyDriveHeader({
  streak,
  streakActiveToday,
  name,
  signedIn,
  counts,
}: {
  streak: number;
  streakActiveToday?: boolean;
  name: string;
  resting?: number;
  signedIn?: boolean;
  counts?: TodayCounts;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <header className="px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-[15px] font-semibold tracking-tight text-white/90"
        >
          {fullDate()}
        </motion.p>
        {signedIn ? (
          <Link
            href="/settings"
            aria-label="Profile & settings"
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

      <Pills streak={streak} streakActiveToday={streakActiveToday} counts={counts} />
    </header>
  );
}

function Pills({
  streak,
  streakActiveToday,
  counts,
}: {
  streak: number;
  streakActiveToday?: boolean;
  counts?: TodayCounts;
}) {
  const streakActive = streak > 0 && streakActiveToday;
  const streakTone = streakActive
    ? "border-amber-300/35 bg-amber-300/15 text-amber-200"
    : streak > 0
      ? "border-amber-300/20 bg-amber-300/10 text-amber-200/80"
      : "border-white/10 bg-white/[0.04] text-white/55";

  const focusDone = counts ? counts.focusDone : 0;
  const focusTotal = counts ? counts.focusTotal : 0;
  const focusActive = focusTotal > 0 && focusDone === focusTotal;
  const focusTone =
    focusTotal === 0
      ? "border-white/10 bg-white/[0.04] text-white/45"
      : focusActive
        ? "border-accent-violet/40 bg-accent-violet/15 text-accent-violet"
        : "border-accent-violet/25 bg-accent-violet/10 text-white/80";

  const habitsDone = counts ? counts.habitsDone : 0;
  const habitsTotal = counts ? counts.habitsTotal : 0;
  const habitsActive = habitsTotal > 0 && habitsDone === habitsTotal;
  const habitsTone =
    habitsTotal === 0
      ? "border-white/10 bg-white/[0.04] text-white/45"
      : habitsActive
        ? "border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
        : "border-accent-cyan/25 bg-accent-cyan/10 text-white/80";

  const movement = counts?.movementDone ?? 0;
  const movementTone =
    movement >= 1
      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
      : "border-white/10 bg-white/[0.04] text-white/55";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <Pill tone={streakTone} icon={<Flame className="h-3.5 w-3.5" />}>
        {streak}-day streak
      </Pill>
      <Pill tone={focusTone} icon={<Target className="h-3.5 w-3.5" />}>
        {focusTotal > 0 ? `${focusDone}/${focusTotal} focus` : "focus"}
      </Pill>
      <Pill tone={habitsTone} icon={<Repeat className="h-3.5 w-3.5" />}>
        {habitsTotal > 0 ? `${habitsDone}/${habitsTotal} habits` : "habits"}
      </Pill>
      <Pill tone={movementTone} icon={<Dumbbell className="h-3.5 w-3.5" />}>
        {movement > 0 ? `${movement} movement` : "movement"}
      </Pill>
    </div>
  );
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center gap-1 rounded-pill border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider tabular-nums ${tone}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}
