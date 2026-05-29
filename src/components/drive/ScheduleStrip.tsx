"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
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
}: {
  blocks: MockBlock[];
  /** `compact` for the Daily Drive preview (shorter), `comfortable` for the Calendar page */
  density?: "compact" | "comfortable";
}) {
  const DAY_START = 6;
  const DAY_END = 22;
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);
  // Pixels per hour. Comfortable = readable on mobile.
  const PX_PER_HOUR = density === "compact" ? 32 : 56;
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
                  {((h + 11) % 12) + 1}
                  {h < 12 ? " am" : " pm"}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
            ))}
          </div>
          {/* blocks layered */}
          <div className="relative ml-12 h-full">
            {blocks.map((b, i) => {
              const top = (pos(b.start, DAY_START, DAY_END) / 100) * totalHeight;
              const bottom = (pos(b.end, DAY_START, DAY_END) / 100) * totalHeight;
              const height = Math.max(28, bottom - top);
              const c = b.area ? areaColor(b.area) : "#A1A1AA";
              const isFocus = b.kind === "focus";
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.35 }}
                  className="absolute right-0 left-2 flex flex-col justify-center overflow-hidden rounded-2xl px-3 py-1.5"
                  style={{
                    top,
                    height,
                    background: isFocus
                      ? "linear-gradient(135deg, rgba(124,92,255,0.32) 0%, rgba(0,212,255,0.18) 100%)"
                      : "rgba(255,255,255,0.06)",
                    border: isFocus ? "1px solid rgba(124,92,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isFocus ? "0 6px 18px rgba(124,92,255,0.25)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {isFocus && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />}
                    <span className="truncate text-[13px] font-medium text-white/95">{b.title}</span>
                  </div>
                  {height >= 40 && (
                    <span className="mt-0.5 text-[10px] tabular-nums text-white/55">
                      {fmtTime(b.start)} – {fmtTime(b.end)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
