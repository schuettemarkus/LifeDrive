"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";

export type UpcomingEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  isLifeDrive?: boolean;
};

const FOUR_HOURS_MS = 4 * 3600 * 1000;

function fmt(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "today";
  if (date.toDateString() === tomorrow.toDateString()) return "tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function UpcomingEvents({ initialEvents }: { initialEvents?: UpcomingEvent[] }) {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(initialEvents ?? null);
  const [loading, setLoading] = useState(!initialEvents);
  const [now, setNow] = useState(() => Date.now());

  // Re-tick the "current 4h window" highlight every minute so it stays accurate
  // without the user pulling to refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (initialEvents) return;
    let cancelled = false;
    async function load() {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 48 * 3600 * 1000);
        const url = `/api/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
        const res = await fetch(url);
        const j = await res.json();
        if (!cancelled && Array.isArray(j.events)) setEvents(j.events);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialEvents]);

  // Only upcoming (event end is in the future). Limit to next 10. Skip LifeDrive's
  // own auto-scheduled focus blocks so the section is just real calendar context.
  const visible = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => new Date(e.end).getTime() > now && !e.isLifeDrive)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10);
  }, [events, now]);

  return (
    <section className="px-4">
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <CalendarClock className="h-3.5 w-3.5" />
        upcoming events
      </h2>

      {loading ? (
        <GlassCard inset variant="subtle">
          <p className="text-xs text-white/45">loading calendar…</p>
        </GlassCard>
      ) : visible.length === 0 ? (
        <GlassCard inset variant="subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-cyan" />
            <p className="text-sm text-white/70">
              Nothing on the calendar for the next two days. Free skies.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {visible.map((ev, i) => {
            const start = new Date(ev.start).getTime();
            const end = new Date(ev.end).getTime();
            const inWindow = start <= now + FOUR_HOURS_MS && end >= now;
            const isLive = start <= now && end >= now;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i }}
              >
                <GlassCard
                  inset
                  variant={inWindow ? "strong" : "subtle"}
                  className={
                    inWindow
                      ? "relative overflow-hidden ring-1 ring-accent-violet/40 shadow-glow"
                      : ""
                  }
                >
                  {inWindow && (
                    <div
                      aria-hidden
                      className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-violet/30 blur-3xl"
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div className="min-w-[64px] text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                        {dayLabel(ev.start)}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-white/90">
                        {fmt(ev.start)}
                      </p>
                      <p className="text-[10px] tabular-nums text-white/45">{fmt(ev.end)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="inline-flex items-center gap-1 rounded-pill border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-300" />
                            now
                          </span>
                        )}
                        {inWindow && !isLive && (
                          <span className="rounded-pill border border-accent-violet/40 bg-accent-violet/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                            next 4h
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[14.5px] font-medium leading-snug text-white/95">
                        {ev.summary || "(busy)"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
