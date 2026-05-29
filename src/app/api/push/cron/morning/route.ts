import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";
import { getOrLockTodaysFocus, todayInTz } from "@/lib/daily-focus";
import type { Item } from "@/types/database";

/**
 * Cron entry point. Called by Vercel Cron (vercel.json) every morning.
 * Must present `Authorization: Bearer ${PUSH_CRON_SECRET}` or it returns 401.
 *
 * For every user with push enabled, sends a notification anchored on today's
 * #1 focus task (highest impact / highest priority of the locked top-3),
 * with secondary context about habits + total focus count.
 */
function authorize(req: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.PUSH_CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return await run();
}

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return await run();
}

async function run() {
  const admin = supabaseService();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("morning_briefing", true);
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  let sent = 0;

  for (const userId of userIds) {
    const { data: profile } = await admin
      .from("profiles")
      .select("household_id, display_name, timezone")
      .eq("id", userId)
      .maybeSingle<{ household_id: string | null; display_name: string | null; timezone: string | null }>();
    if (!profile?.household_id) continue;

    const tz = profile.timezone;
    const today = todayInTz(tz);
    const todayDow = new Date().getDay();

    const [{ data: items }, { data: habits }] = await Promise.all([
      admin.from("items").select("*").eq("household_id", profile.household_id),
      admin
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true)
        .contains("days_of_week", [todayDow]),
    ]);

    const allItems = (items ?? []) as Item[];

    // Lock today's focus picks if not already locked — this is the same
    // function the Drive surface uses, so the cron + UI agree on what
    // "today's #1" is.
    const lockedIds = await getOrLockTodaysFocus({
      supabase: admin as any,
      userId,
      householdId: profile.household_id,
      items: allItems,
      tz,
    });

    const lockedOpen = lockedIds
      .map((id) => allItems.find((i) => i.id === id))
      .filter((i): i is Item => Boolean(i) && i!.status !== "done");

    const numberOne = lockedOpen[0];
    if (!numberOne) continue; // nothing to nudge about

    const habitsCount = (habits ?? []).length;
    const extras: string[] = [];
    if (lockedOpen.length > 1) extras.push(`+${lockedOpen.length - 1} more focus`);
    if (habitsCount > 0) extras.push(`${habitsCount} habits`);

    const title = `Today's focus: ${numberOne.title.slice(0, 80)}`;
    const body = extras.length > 0 ? extras.join(" · ") : "One thing, today.";

    const r = await sendToUser(
      userId,
      { title, body, url: "/", tag: "morning-focus" },
      "morning_briefing",
    );
    sent += r.sent;
  }

  return NextResponse.json({ users: userIds.length, sent });
}
