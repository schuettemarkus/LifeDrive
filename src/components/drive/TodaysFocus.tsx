"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { PriorityRing } from "@/components/glass/PriorityRing";
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

export function TodaysFocus({
  items,
  totalLocked,
}: {
  items: MockItem[];
  /** how many slots were locked in for today (3 once seeded). When items.length < totalLocked some are completed. */
  totalLocked?: number;
}) {
  const router = useRouter();
  const [first, ...rest] = items;
  const [celebrate, setCelebrate] = useState(0);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);

  async function complete(id: string) {
    try {
      await fetch(`/api/items/${id}/complete`, { method: "POST" });
      setCelebrate((n) => n + 1);
    } catch {
      /* row already vanished optimistically; surface refresh will reconcile */
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
      void fetch("/api/prioritize?persist=true", { method: "GET" });
    } catch {
      /* swallow */
    } finally {
      setSnoozeFor(null);
      router.refresh();
    }
  }

  const allCleared = (totalLocked ?? 0) > 0 && items.length === 0;

  return (
    <section className="px-4">
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <Sparkles className="h-3.5 w-3.5" />
        today's focus
      </h2>

      {allCleared && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard variant="strong" inset glow className="relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/30 blur-3xl"
            />
            <div className="relative grid place-items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-300" />
              <h3 className="text-[20px] font-semibold tracking-tight text-white">
                Today's three are done.
              </h3>
              <p className="max-w-sm text-sm text-white/65">
                You moved the needle on what mattered. Anything else today is a bonus — rest, breathe,
                or drop new ideas into Capture.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {first && (
        <HeroCard
          item={first}
          onComplete={() => complete(first.id)}
          onSnooze={() => openSnooze(first.id)}
        />
      )}

      <div className="mt-3 space-y-2.5">
        {rest.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
          >
            <SwipeRow
              onComplete={() => complete(item.id)}
              onSnooze={() => openSnooze(item.id)}
            >
              <GlassCard inset className="flex items-center gap-3">
                <PriorityRing value={70 - i * 18} size={44} stroke={3} label={`${i + 2}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <AreaPill area={item.area} size="xs" />
                    <span className="text-[11px] text-white/40">{formatMinutes(item.effortMinutes)}</span>
                  </div>
                  <p className="mt-1 truncate text-[15px] font-medium text-white/95">{item.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/45">{item.reason}</p>
                </div>
                <div className="text-right text-[10px] uppercase tracking-wider text-white/40">
                  {timeRange(item.scheduledStart, item.scheduledEnd) ?? "—"}
                </div>
              </GlassCard>
            </SwipeRow>
          </motion.div>
        ))}
      </div>

      <Celebration trigger={celebrate} />
      <SnoozePicker
        open={snoozeFor !== null}
        onClose={() => setSnoozeFor(null)}
        onPick={applySnooze}
      />
    </section>
  );
}

function HeroCard({
  item,
  onComplete,
  onSnooze,
}: {
  item: MockItem;
  onComplete: () => void;
  onSnooze: () => void;
}) {
  const c = areaColor(item.area);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <SwipeRow onComplete={onComplete} onSnooze={onSnooze}>
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
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatMinutes(item.effortMinutes)}</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-white/30">
              swipe right → complete · swipe left → snooze
            </p>
          </div>
        </GlassCard>
      </SwipeRow>
    </motion.div>
  );
}
