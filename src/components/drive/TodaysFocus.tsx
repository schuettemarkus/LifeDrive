"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { SwipeRow } from "@/components/glass/SwipeRow";
import { Celebration } from "@/components/glass/Celebration";
import { SnoozePicker, snoozeChoiceToPatch, type SnoozeChoice } from "@/components/glass/SnoozePicker";
import { formatMinutes } from "@/lib/utils";
import { areaColor } from "@/lib/design";
import type { MockItem } from "@/lib/mock-data";

function timeRange(start?: string, end?: string) {
  if (!start || !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} → ${fmt(end)}`;
}

/**
 * Today's Focus surface — single-task queue.
 *
 * Renders only the first still-open locked focus item. Swipe right to
 * complete (server marks done, slot empties, next locked task slides in).
 * Swipe left to snooze (off today, next slides in).
 *
 * When `items` is empty AND at least one task was locked in for today,
 * we know the user has cleared all three picks → show the "you crushed it"
 * celebration card.
 */
export function TodaysFocus({
  items,
  totalLocked,
}: {
  items: MockItem[];
  /** Total number of focus slots locked for today (typically 3). Drives the all-clear message. */
  totalLocked?: number;
}) {
  const router = useRouter();
  const [celebrate, setCelebrate] = useState(0);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);

  async function complete(id: string) {
    try {
      await fetch(`/api/items/${id}/complete`, { method: "POST" });
      setCelebrate((n) => n + 1);
    } catch {
      /* will reconcile on refresh */
    } finally {
      router.refresh();
    }
  }

  function openSnooze(id: string) {
    setSnoozeFor(id);
  }

  async function applySnooze(choice: SnoozeChoice) {
    const id = snoozeFor;
    if (!id) return;
    const patch = snoozeChoiceToPatch(choice);
    try {
      await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      /* swallow */
    } finally {
      setSnoozeFor(null);
      router.refresh();
    }
  }

  const current = items[0];
  const allCleared = (totalLocked ?? 0) > 0 && items.length === 0;
  const slot = (totalLocked ?? 0) - items.length + 1; // 1-indexed for display

  return (
    <section className="px-4">
      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
          <Sparkles className="h-3.5 w-3.5" />
          today's focus
        </h2>
        {totalLocked && totalLocked > 0 && !allCleared && (
          <span className="text-[10px] uppercase tracking-[0.18em] tabular-nums text-white/40">
            {Math.min(slot, totalLocked)} of {totalLocked}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {allCleared ? (
          <motion.div
            key="crushed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard variant="strong" inset glow className="relative overflow-hidden">
              <div
                aria-hidden
                className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/30 blur-3xl"
              />
              <div className="relative grid place-items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                <h3 className="text-[22px] font-semibold tracking-tight text-white">
                  You crushed it today.
                </h3>
                <p className="max-w-sm text-sm text-white/65">
                  All three focus tasks done. Anything else is a bonus — rest, breathe, or drop new
                  ideas into Capture.
                </p>
                <Link
                  href="/capture"
                  className="mt-2 inline-block rounded-pill border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-white/85"
                >
                  add an idea
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        ) : current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.35 }}
          >
            <SwipeRow
              onComplete={() => complete(current.id)}
              onSnooze={() => openSnooze(current.id)}
            >
              <HeroCard item={current} />
            </SwipeRow>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Celebration trigger={celebrate} />
      <SnoozePicker
        open={snoozeFor !== null}
        onClose={() => setSnoozeFor(null)}
        onPick={applySnooze}
      />
    </section>
  );
}

function HeroCard({ item }: { item: MockItem }) {
  const c = areaColor(item.area);
  return (
    <GlassCard
      variant="strong"
      inset
      glow
      className="relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
        style={{ background: `${c}55` }}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <AreaPill area={item.area} size="sm" />
          {item.isNextAction && (
            <span className="rounded-pill border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
              next action
            </span>
          )}
        </div>
        <h3 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-balance text-white">
          {item.title}
        </h3>
        {item.notes && <p className="mt-1 text-sm text-white/55">{item.notes}</p>}

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">scheduled</p>
            <p className="mt-1 text-base font-semibold text-white">
              {timeRange(item.scheduledStart, item.scheduledEnd) ?? "unscheduled"}
            </p>
            <p className="mt-0.5 text-[11px] text-white/50">{item.reason}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">effort</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {formatMinutes(item.effortMinutes)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
          swipe right → complete · swipe left → snooze
        </p>
      </div>
    </GlassCard>
  );
}
