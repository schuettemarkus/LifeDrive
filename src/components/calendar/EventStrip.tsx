"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import type { MockBlock } from "@/lib/mock-data";
import type { LifeAreaKey } from "@/lib/design";

type RemoteEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  isLifeDrive: boolean;
  itemId: string | null;
};

export function EventStrip() {
  const [events, setEvents] = useState<RemoteEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    fetch(`/api/calendar/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Failed");
        setEvents(j.events ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="px-4 pt-4 text-center text-xs text-white/45">
        connect google calendar in settings to see today's real events.
      </div>
    );
  }

  if (!events) {
    return (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="px-4 pt-4 text-center text-xs text-white/45"
      >
        loading your calendar…
      </motion.div>
    );
  }

  const blocks: MockBlock[] = events.map((e) => ({
    id: e.id,
    kind: e.isLifeDrive ? "focus" : "event",
    title: e.summary,
    area: e.isLifeDrive ? "growth" : undefined, // could be enriched via the item id lookup
    start: e.start,
    end: e.end,
    itemId: e.itemId,
  })).filter((b) => b.start && b.end) as (MockBlock & { area?: LifeAreaKey })[];

  return <ScheduleStrip blocks={blocks} />;
}
