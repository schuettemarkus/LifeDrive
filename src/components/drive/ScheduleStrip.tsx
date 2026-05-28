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

export function ScheduleStrip({ blocks }: { blocks: MockBlock[] }) {
  const DAY_START = 6;
  const DAY_END = 22;
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);

  return (
    <section className="px-4">
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <Calendar className="h-3.5 w-3.5" />
        today's schedule
      </h2>

      <GlassCard className="overflow-hidden p-4">
        <div className="relative h-44">
          {/* hour rails */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {hours.map((h) => (
              <div key={h} className="flex items-center gap-2">
                <span className="w-8 text-[9px] tabular-nums text-white/30">
                  {((h + 11) % 12) + 1}
                  {h < 12 ? "a" : "p"}
                </span>
                <div className="h-px flex-1 bg-white/[0.04]" />
              </div>
            ))}
          </div>
          {/* blocks layered */}
          <div className="relative ml-10 h-full">
            {blocks.map((b, i) => {
              const top = pos(b.start, DAY_START, DAY_END);
              const bottom = pos(b.end, DAY_START, DAY_END);
              const height = Math.max(2.5, bottom - top);
              const c = b.area ? areaColor(b.area) : "#A1A1AA";
              const isFocus = b.kind === "focus";
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.35 }}
                  className="absolute right-0 left-2 overflow-hidden rounded-2xl px-3 py-1.5 text-[11px]"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    background: isFocus
                      ? "linear-gradient(135deg, rgba(124,92,255,0.32) 0%, rgba(0,212,255,0.18) 100%)"
                      : "rgba(255,255,255,0.05)",
                    border: isFocus ? "1px solid rgba(124,92,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isFocus ? "0 6px 18px rgba(124,92,255,0.25)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {isFocus && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />}
                    <span className="truncate font-medium text-white/95">{b.title}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
