"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Repeat, Dumbbell } from "lucide-react";

export type TodayCounts = {
  focusTotal: number;
  focusDone: number;
  habitsTotal: number;
  habitsDone: number;
  movementDone: number;
};

function compactDate(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DailyDriveHeader({
  name,
  signedIn,
  counts,
}: {
  streak?: number;
  streakActiveToday?: boolean;
  name: string;
  resting?: number;
  signedIn?: boolean;
  counts?: TodayCounts;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  const focusDone = counts?.focusDone ?? 0;
  const focusTotal = counts?.focusTotal ?? 0;
  const habitsDone = counts?.habitsDone ?? 0;
  const habitsTotal = counts?.habitsTotal ?? 0;
  const movement = counts?.movementDone ?? 0;

  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex items-center justify-between gap-2 px-4 pt-6"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap text-[13px] font-semibold tracking-tight text-white/90">
          {compactDate()}
        </span>
        <Pill
          tone={
            focusTotal > 0 && focusDone === focusTotal
              ? "border-accent-violet/40 bg-accent-violet/15 text-accent-violet"
              : focusTotal > 0
                ? "border-accent-violet/25 bg-accent-violet/10 text-white/80"
                : "border-white/10 bg-white/[0.04] text-white/45"
          }
          icon={<Target className="h-3.5 w-3.5" />}
        >
          {focusTotal > 0 ? `${focusDone}/${focusTotal}` : "—"}
        </Pill>
        <Pill
          tone={
            habitsTotal > 0 && habitsDone === habitsTotal
              ? "border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan"
              : habitsTotal > 0
                ? "border-accent-cyan/25 bg-accent-cyan/10 text-white/80"
                : "border-white/10 bg-white/[0.04] text-white/45"
          }
          icon={<Repeat className="h-3.5 w-3.5" />}
        >
          {habitsTotal > 0 ? `${habitsDone}/${habitsTotal}` : "—"}
        </Pill>
        <Pill
          tone={
            movement >= 1
              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-white/55"
          }
          icon={<Dumbbell className="h-3.5 w-3.5" />}
        >
          {movement}×
        </Pill>
      </div>
      {signedIn ? (
        <Link
          href="/settings"
          aria-label="Profile & settings"
          className="no-tap-highlight grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/85"
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
    </motion.header>
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
      className={`flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}
