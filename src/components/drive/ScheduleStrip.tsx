"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { areaColor } from "@/lib/design";
import type { MockBlock } from "@/lib/mock-data";

function pos(d: string, dayStart: number, dayEnd: number) {
  const t = new Date(d);
  const minutes = t.getHours() * 60 + t.getMinutes();
  return ((minutes - dayStart * 60) / ((dayEnd - dayStart) * 60)) * 100;
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ScheduleStrip({
  blocks,
  density = "comfortable",
  fullDay = false,
}: {
  blocks: MockBlock[];
  /** `compact` for the Daily Drive preview (shorter), `comfortable` for the Calendar page */
  density?: "compact" | "comfortable";
  /** When true, render the entire 24-hour day instead of just the active window. */
  fullDay?: boolean;
}) {
  const DAY_START = fullDay ? 0 : 6;
  const DAY_END = fullDay ? 24 : 22;
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);
  // Pixels per hour. Comfortable = readable on mobile. Full-day mode squeezes a
  // little tighter so the whole 24 hours stays glanceable.
  const PX_PER_HOUR = density === "compact" ? 32 : fullDay ? 44 : 56;
  const totalHeight = (DAY_END - DAY_START) * PX_PER_HOUR;

  return (
    <section className="px-4">
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <Calendar className="h-3.5 w-3.5" />
        today's schedule
      </h2>

      <GlassCard className="overflow-hidden p-3">
        <div className="relative" style={{ height: totalHeight }}>
          {/* hour rails */}
          <div className="absolute inset-0">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-center gap-2"
                style={{ top: i * PX_PER_HOUR }}
              >
                <span className="w-10 text-[10px] font-medium tabular-nums text-white/40">
                  {h === 0 ? "12 am" : h === 24 ? "12 am" : `${((h + 11) % 12) + 1}${h < 12 ? " am" : " pm"}`}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
            ))}
          </div>
          {/* now indicator */}
          {(() => {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const startMins = DAY_START * 60;
            const endMins = DAY_END * 60;
            if (nowMins < startMins || nowMins > endMins) return null;
            const top = ((nowMins - startMins) / (endMins - startMins)) * totalHeight;
            return (
              <div
                className="absolute left-0 right-0 z-10 flex items-center gap-2"
                style={{ top }}
              >
                <span className="w-10 text-[10px] font-bold tabular-nums text-rose-300">now</span>
                <div className="h-[1.5px] flex-1 bg-rose-400/70" />
              </div>
            );
          })()}
          {/* blocks layered */}
          <div className="relative ml-12 h-full">
            {(() => {
              // Lay blocks out in side-by-side columns when they overlap in time.
              // Classic interval-graph greedy assignment: sort by start, drop into
              // the leftmost column whose last block has already ended.
              type Laid = (typeof blocks)[number] & {
                _col: number;
                _cols: number;
                _startMs: number;
                _endMs: number;
              };
              const sorted = [...blocks]
                .map((b) => ({
                  ...b,
                  _startMs: new Date(b.start).getTime(),
                  _endMs: new Date(b.end).getTime(),
                }))
                .sort((a, b) => a._startMs - b._startMs);
              const columns: number[] = []; // endMs per column
              const placed: Laid[] = [];
              for (const b of sorted) {
                let col = columns.findIndex((endMs) => endMs <= b._startMs);
                if (col === -1) {
                  col = columns.length;
                  columns.push(b._endMs);
                } else {
                  columns[col] = b._endMs;
                }
                placed.push({ ...b, _col: col, _cols: 0 });
              }
              // Cluster pass: every block needs to know the max column count
              // among the overlapping group it belongs to so widths add up.
              const intervals = placed.map((p) => ({ start: p._startMs, end: p._endMs }));
              for (let i = 0; i < placed.length; i++) {
                let cols = placed[i]._col + 1;
                for (let j = 0; j < placed.length; j++) {
                  if (i === j) continue;
                  if (
                    intervals[j].start < intervals[i].end &&
                    intervals[j].end > intervals[i].start
                  ) {
                    cols = Math.max(cols, placed[j]._col + 1);
                  }
                }
                placed[i]._cols = cols;
              }
              return placed.map((b, i) => {
                const top = (pos(b.start, DAY_START, DAY_END) / 100) * totalHeight;
                const bottom = (pos(b.end, DAY_START, DAY_END) / 100) * totalHeight;
                const height = Math.max(28, bottom - top);
                const c = b.area ? areaColor(b.area) : "#A1A1AA";
                const isFocus = b.kind === "focus";
                const colWidthPct = 100 / b._cols;
                const leftPct = b._col * colWidthPct;
                const gapPct = 1.5;
                const inner = (
                  <>
                    <div className="flex items-center gap-1.5">
                      {isFocus && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
                      )}
                      <span className="truncate text-[13px] font-medium text-white/95">{b.title}</span>
                    </div>
                    {height >= 40 && (
                      <span className="mt-0.5 text-[10px] tabular-nums text-white/55">
                        {fmtTime(b.start)} – {fmtTime(b.end)}
                      </span>
                    )}
                  </>
                );
                const style = {
                  top,
                  height,
                  left: `calc(${leftPct}% + 8px)`,
                  width: `calc(${colWidthPct}% - 8px - ${gapPct}%)`,
                  background: isFocus
                    ? "linear-gradient(135deg, rgba(124,92,255,0.32) 0%, rgba(0,212,255,0.18) 100%)"
                    : "rgba(255,255,255,0.06)",
                  border: isFocus
                    ? "1px solid rgba(124,92,255,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isFocus ? "0 6px 18px rgba(124,92,255,0.25)" : undefined,
                } as const;
                const className =
                  "absolute flex flex-col justify-center overflow-hidden rounded-2xl px-3 py-1.5";
                const motionProps = {
                  initial: { opacity: 0, x: 6 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: 0.05 * i, duration: 0.35 },
                };
                if (b.itemId) {
                  return (
                    <motion.div key={b.id} {...motionProps} style={style} className={className}>
                      <Link
                        href={`/item/${b.itemId}`}
                        className="no-tap-highlight flex flex-1 flex-col justify-center"
                      >
                        {inner}
                      </Link>
                    </motion.div>
                  );
                }
                return (
                  <motion.div key={b.id} {...motionProps} style={style} className={className}>
                    {inner}
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
