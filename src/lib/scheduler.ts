/**
 * Auto-scheduler.
 *
 * Walks the ranked queue and packs items into the user's free time, preferring
 * the seeded focus windows for high-priority / deep-focus work first.
 *
 * Free time = (working_hours per day) − (busy intervals from Google).
 * High-priority items fill focus windows first; the rest spill into the
 * remaining free slots. Always proposes; never silently writes events.
 */
import { freeSlotsInDay, listEvents } from "@/lib/google";
import { rankItems, computeAreaDistribution, type RankedItem } from "@/lib/priority";
import type { FocusWindow, Item, WorkingHours } from "@/types/database";

export type ProposedBlock = {
  item: RankedItem;
  start: Date;
  end: Date;
  inFocusWindow: boolean;
};

const BUFFER_MIN = 10;

function combineDateAndTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function withinAny(window: { start: Date; end: Date }, slots: { start: Date; end: Date }[]) {
  return slots.some((s) => window.start >= s.start && window.end <= s.end);
}

function trimSlot(
  slot: { start: Date; end: Date },
  block: { start: Date; end: Date },
): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  if (block.start.getTime() - slot.start.getTime() > 5 * 60 * 1000) {
    out.push({ start: slot.start, end: new Date(block.start.getTime() - BUFFER_MIN * 60 * 1000) });
  }
  if (slot.end.getTime() - block.end.getTime() > 5 * 60 * 1000) {
    out.push({ start: new Date(block.end.getTime() + BUFFER_MIN * 60 * 1000), end: slot.end });
  }
  return out.filter((s) => s.end > s.start);
}

function place(
  slots: { start: Date; end: Date }[],
  durationMs: number,
): { slot: { start: Date; end: Date }; block: { start: Date; end: Date } } | null {
  for (const s of slots) {
    if (s.end.getTime() - s.start.getTime() >= durationMs) {
      const start = new Date(s.start);
      const end = new Date(start.getTime() + durationMs);
      return { slot: s, block: { start, end } };
    }
  }
  return null;
}

/** Build per-day free slots inside working hours, given today's events. */
export function dailyFreeSlots(opts: {
  day: Date;
  working: WorkingHours;
  busy: { start: Date; end: Date }[];
}) {
  const dayStart = combineDateAndTime(opts.day, opts.working.start);
  const dayEnd = combineDateAndTime(opts.day, opts.working.end);
  return freeSlotsInDay({ dayStart, dayEnd, busy: opts.busy });
}

/** Score-cutoff for an item to be eligible for focus windows. */
const DEEP_FOCUS_MIN_SCORE = 0.45;

/**
 * Pack the ranked items into free slots, focus-windows-first for the top half.
 * Returns a proposed plan; nothing is written.
 */
export function packDay(opts: {
  day: Date;
  ranked: RankedItem[];
  free: { start: Date; end: Date }[];
  focusWindows: FocusWindow[];
}): ProposedBlock[] {
  const proposed: ProposedBlock[] = [];
  let slots = opts.free.map((s) => ({ ...s }));

  const focusZones = opts.focusWindows.map((w) => ({
    start: combineDateAndTime(opts.day, w.start),
    end: combineDateAndTime(opts.day, w.end),
  }));

  // PASS 1: deep-focus candidates into focus windows.
  for (const item of opts.ranked) {
    if (proposed.find((p) => p.item.id === item.id)) continue;
    if (item.computed.score < DEEP_FOCUS_MIN_SCORE) continue;
    const dur = Math.max(15, Math.min(180, item.effort_minutes ?? 45)) * 60 * 1000;

    // Find a free slot fully inside a focus window.
    const focusSlots = slots.filter((s) =>
      focusZones.some((fz) => s.start >= fz.start && s.end <= fz.end),
    );
    // Also allow slots that overlap a focus window — trim the candidate to inside it.
    const overlapping = slots
      .map((s) => {
        for (const fz of focusZones) {
          const start = new Date(Math.max(s.start.getTime(), fz.start.getTime()));
          const end = new Date(Math.min(s.end.getTime(), fz.end.getTime()));
          if (end.getTime() - start.getTime() >= dur) return { start, end, base: s };
        }
        return null;
      })
      .filter((x): x is { start: Date; end: Date; base: { start: Date; end: Date } } => x !== null);

    let chosen: { slot: { start: Date; end: Date }; block: { start: Date; end: Date } } | null = null;
    if (overlapping.length) {
      const o = overlapping[0];
      chosen = { slot: o.base, block: { start: o.start, end: new Date(o.start.getTime() + dur) } };
    } else if (focusSlots.length) {
      chosen = place(focusSlots, dur);
    }
    if (!chosen) continue;

    proposed.push({ item, start: chosen.block.start, end: chosen.block.end, inFocusWindow: true });
    // Replace the consumed slot with trimmed leftovers.
    const idx = slots.findIndex((s) => s === chosen!.slot);
    if (idx >= 0) {
      slots.splice(idx, 1, ...trimSlot(chosen.slot, chosen.block));
    }
  }

  // PASS 2: everything else into whatever free time remains, in priority order.
  for (const item of opts.ranked) {
    if (proposed.find((p) => p.item.id === item.id)) continue;
    const dur = Math.max(15, Math.min(180, item.effort_minutes ?? 30)) * 60 * 1000;
    const chosen = place(slots, dur);
    if (!chosen) continue;
    proposed.push({
      item,
      start: chosen.block.start,
      end: chosen.block.end,
      inFocusWindow: withinAny({ start: chosen.block.start, end: chosen.block.end }, focusZones),
    });
    const idx = slots.findIndex((s) => s === chosen.slot);
    if (idx >= 0) slots.splice(idx, 1, ...trimSlot(chosen.slot, chosen.block));
  }

  return proposed;
}

/**
 * Top-level: compute a proposed schedule for a day or week.
 */
export async function proposeSchedule(opts: {
  userId: string;
  items: Item[];
  focusWindows: FocusWindow[];
  working: WorkingHours;
  scope: "day" | "week";
}): Promise<ProposedBlock[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = opts.scope === "week" ? 7 : 1;
  const end = new Date(start.getTime() + days * 24 * 3600 * 1000);
  const events = await listEvents(opts.userId, start, end);
  // Only treat *real* (non-LifeDrive) busy events as conflicts so we can replace stale focus blocks.
  const busy = events
    .filter((e) => !e.isLifeDrive)
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));

  const dist = computeAreaDistribution(opts.items);
  const ranked = rankItems(opts.items, dist);

  const all: ProposedBlock[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const dayBusy = busy.filter((b) => b.start.toDateString() === day.toDateString());
    const free = dailyFreeSlots({ day, working: opts.working, busy: dayBusy });
    const remaining = ranked.filter((r) => !all.find((p) => p.item.id === r.id));
    const dayBlocks = packDay({
      day,
      ranked: remaining,
      free,
      focusWindows: opts.focusWindows,
    });
    all.push(...dayBlocks);
  }
  return all;
}
