import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";
import { planForUser } from "@/lib/auto-plan";
import { todayInTz } from "@/lib/daily-focus";
import type { Item } from "@/types/database";

/**
 * Morning cron (Vercel Cron via vercel.json).
 *
 * For every user with push enabled:
 *   1. Lock today's focus picks (3 items)
 *   2. Auto-propose + auto-accept (book to Google Calendar) into their
 *      focus windows. Skips users without Google connected.
 *   3. Push a notification anchored on today's #1 focus task.
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

  let pushed = 0;
  let booked = 0;
  const bookingErrors: string[] = [];

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

    // Auto-plan + auto-book to Google. Fails gracefully when Google isn't
    // connected — still continues to the notification step.
    let firstFocusTitle: string | null = null;
    let bookedToday = 0;
    try {
      const plan = await planForUser({
        supabase: admin as any,
        userId,
        householdId: profile.household_id,
        commit: true,
      });
      bookedToday = plan.accepted;
      booked += plan.accepted;
      bookingErrors.push(...plan.errors);
      firstFocusTitle = plan.proposed[0]?.title ?? null;
    } catch {
      /* swallow — usually means "Google not connected" — fall through to push */
    }

    // If planning didn't yield a #1 (Google off, no focus locked, etc.) read
    // the locked list directly so the notification still works.
    if (!firstFocusTitle) {
      const { data: lock } = await admin
        .from("daily_focus")
        .select("item_ids")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle<{ item_ids: string[] }>();
      const firstId = lock?.item_ids?.[0];
      if (firstId) {
        const { data: item } = await admin
          .from("items")
          .select("title")
          .eq("id", firstId)
          .maybeSingle<Pick<Item, "title">>();
        firstFocusTitle = item?.title ?? null;
      }
    }
    if (!firstFocusTitle) continue;

    const { data: habits } = await admin
      .from("habits")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .contains("days_of_week", [todayDow]);

    const habitsCount = (habits ?? []).length;
    const extras: string[] = [];
    if (bookedToday > 0) extras.push(`${bookedToday} on your calendar`);
    if (habitsCount > 0) extras.push(`${habitsCount} habits`);

    const title = `Today's focus: ${firstFocusTitle.slice(0, 80)}`;
    const body = extras.length > 0 ? extras.join(" · ") : "One thing, today.";

    const r = await sendToUser(
      userId,
      { title, body, url: "/", tag: "morning-focus" },
      "morning_briefing",
    );
    pushed += r.sent;
  }

  return NextResponse.json({
    users: userIds.length,
    pushed,
    booked,
    errors: bookingErrors.slice(0, 10),
  });
}
