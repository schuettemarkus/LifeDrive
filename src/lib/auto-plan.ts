/**
 * Auto-plan + book the locked daily focus tasks to Google Calendar.
 *
 * Shared by:
 *   • /api/calendar/plan (proposes only)
 *   • /api/calendar/plan/accept (writes proposed → real events)
 *   • /api/push/cron/morning (proposes + writes + sends notification)
 *
 * The planner only considers items in the user's `daily_focus` row for today
 * (= the locked top 3). Past-time slots are filtered out by `dailyFreeSlots`,
 * so a 6am block won't be booked at 7am.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { proposeSchedule } from "@/lib/scheduler";
import { createEvent } from "@/lib/google";
import { getOrLockTodaysFocus } from "@/lib/daily-focus";
import type { Database, FocusWindow, Item, Profile, WorkingHours } from "@/types/database";

type Client = SupabaseClient<Database>;

export type BookedBlock = {
  block_id: string;
  item_id: string;
  title: string;
  area: string | null;
  start: string;
  end: string;
  effort_minutes: number;
  google_event_id: string | null;
  status: "proposed" | "accepted" | "skipped";
};

/**
 * Top-level: lock focus, propose blocks, optionally write to Google.
 *
 * - `commit: false` returns proposals only (status = 'proposed' rows already
 *   persisted to schedule_blocks so the user can accept later).
 * - `commit: true` immediately calls Google's API per item and flips each
 *   block to `accepted` (or `skipped` on per-item failure).
 */
export async function planForUser(opts: {
  supabase: Client;
  userId: string;
  householdId: string;
  commit: boolean;
}): Promise<{ proposed: BookedBlock[]; accepted: number; errors: string[] }> {
  const { supabase, userId, householdId, commit } = opts;

  const [{ data: profile }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>(),
    supabase.from("items").select("*").eq("household_id", householdId),
  ]);

  const focusWindows: FocusWindow[] = profile?.focus_windows ?? [];
  const working: WorkingHours = profile?.working_hours ?? { start: "06:00", end: "21:00" };
  const tz = profile?.timezone ?? null;

  const allItems = (items ?? []) as Item[];
  const lockedIds = await getOrLockTodaysFocus({
    supabase,
    userId,
    householdId,
    items: allItems,
    tz,
  });
  const focusOnly = lockedIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is Item => Boolean(i) && i!.status !== "done");

  if (focusOnly.length === 0) {
    return { proposed: [], accepted: 0, errors: [] };
  }

  const proposed = await proposeSchedule({
    userId,
    items: focusOnly,
    focusWindows,
    working,
    scope: "day",
  });

  // Wipe any stale 'proposed' rows for today before re-inserting.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  await supabase
    .from("schedule_blocks")
    .delete()
    .eq("user_id", userId)
    .eq("status", "proposed")
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString());

  if (proposed.length === 0) {
    return { proposed: [], accepted: 0, errors: [] };
  }

  const rows = proposed.map((p) => ({
    item_id: p.item.id,
    user_id: userId,
    starts_at: p.start.toISOString(),
    ends_at: p.end.toISOString(),
    status: "proposed" as const,
  }));
  const { data: inserted, error: insertError } = await supabase
    .from("schedule_blocks")
    .insert(rows)
    .select("*");
  if (insertError) {
    return { proposed: [], accepted: 0, errors: [insertError.message] };
  }

  const blocks: BookedBlock[] = proposed.map((p, i) => ({
    block_id: (inserted as any)?.[i]?.id ?? `pending-${i}`,
    item_id: p.item.id,
    title: p.item.title,
    area: p.item.life_area,
    start: p.start.toISOString(),
    end: p.end.toISOString(),
    effort_minutes: p.item.effort_minutes ?? 30,
    google_event_id: null,
    status: "proposed",
  }));

  if (!commit) return { proposed: blocks, accepted: 0, errors: [] };

  // Commit pass: write to Google + flip status.
  const errors: string[] = [];
  let accepted = 0;
  for (const b of blocks) {
    try {
      const event = await createEvent(userId, {
        summary: `🎯 ${b.title}`,
        description: `Life Drive focus block — ${b.area ?? ""}`,
        start: new Date(b.start),
        end: new Date(b.end),
        itemId: b.item_id,
      });
      await supabase
        .from("schedule_blocks")
        .update({ status: "accepted", google_event_id: event.id ?? null })
        .eq("id", b.block_id);
      b.status = "accepted";
      b.google_event_id = event.id ?? null;
      accepted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "google_error";
      errors.push(`${b.title}: ${msg}`);
      await supabase
        .from("schedule_blocks")
        .update({ status: "skipped" })
        .eq("id", b.block_id);
      b.status = "skipped";
    }
  }
  return { proposed: blocks, accepted, errors };
}
