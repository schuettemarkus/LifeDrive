import { NextResponse } from "next/server";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { proposeSchedule } from "@/lib/scheduler";
import { getOrLockTodaysFocus } from "@/lib/daily-focus";
import type { FocusWindow, WorkingHours, Profile, Item } from "@/types/database";

export async function POST(req: Request) {
  try {
    const { user, householdId, supabase } = await requireCurrentUserAndHousehold();
    const url = new URL(req.url);
    const scope = (url.searchParams.get("scope") ?? "day") as "day" | "week";

    const [{ data: profile }, { data: items }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
      supabase.from("items").select("*").eq("household_id", householdId),
    ]);

    const focusWindows: FocusWindow[] = profile?.focus_windows ?? [];
    const working: WorkingHours = profile?.working_hours ?? { start: "06:00", end: "21:00" };

    // Only the locked top-3 daily focus items get auto-scheduled onto the calendar.
    // No more than 3 events per day get pushed.
    const allItems = (items ?? []) as Item[];
    const lockedIds = await getOrLockTodaysFocus({
      supabase,
      userId: user.id,
      householdId,
      items: allItems,
      tz: (profile as { timezone?: string } | null)?.timezone ?? null,
    });
    const focusOnly = lockedIds
      .map((id) => allItems.find((i) => i.id === id))
      .filter((i): i is Item => Boolean(i) && i!.status !== "done");

    const proposed = await proposeSchedule({
      userId: user.id,
      items: focusOnly,
      focusWindows,
      working,
      scope,
    });

    // Replace any existing 'proposed' blocks for this user in the same window.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const days = scope === "week" ? 7 : 1;
    const end = new Date(start.getTime() + days * 24 * 3600 * 1000);
    await supabase
      .from("schedule_blocks")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "proposed")
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString());

    const rows = proposed.map((p) => ({
      item_id: p.item.id,
      user_id: user.id,
      starts_at: p.start.toISOString(),
      ends_at: p.end.toISOString(),
      status: "proposed" as const,
    }));
    if (rows.length === 0) return NextResponse.json({ proposed: [] });

    const { data: inserted, error } = await supabase
      .from("schedule_blocks")
      .insert(rows)
      .select("*");
    if (error) throw error;

    const out = proposed.map((p, i) => ({
      block_id: (inserted as any)?.[i]?.id ?? `pending-${i}`,
      item_id: p.item.id,
      title: p.item.title,
      area: p.item.life_area,
      start: p.start.toISOString(),
      end: p.end.toISOString(),
      effort_minutes: p.item.effort_minutes,
      in_focus_window: p.inFocusWindow,
    }));
    return NextResponse.json({ proposed: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "plan_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
