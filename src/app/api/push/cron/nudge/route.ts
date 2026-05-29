import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";
import { todayInTz } from "@/lib/daily-focus";
import type { Item } from "@/types/database";

/**
 * Mid-day nudge cron. Fires around lunch (~12pm local) and around dinner
 * (~6pm local) — see vercel.json for the UTC schedules.
 *
 * Behavior: for each user with morning_briefing push enabled, look up
 * today's locked #1 focus task. If it's *not* completed yet, send a
 * gentle nudge ("Still time to land your #1: <title>"). If it is
 * already done, send nothing — we don't want to spam users who've
 * already moved the needle.
 *
 * Variant is picked via ?variant=lunch | dinner so the copy stays fresh.
 */
function authorize(req: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.PUSH_CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

type Variant = "lunch" | "dinner";

const COPY: Record<Variant, { title: (t: string) => string; body: string }> = {
  lunch: {
    title: (t) => `Still got time for: ${t.slice(0, 70)}`,
    body: "A clean 30 minutes after lunch is often all it takes.",
  },
  dinner: {
    title: (t) => `Last call on #1: ${t.slice(0, 70)}`,
    body: "Knock it out before dinner so today goes in the win column.",
  },
};

export async function POST(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return await run(req);
}

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return await run(req);
}

async function run(req: Request) {
  const url = new URL(req.url);
  const variant = (url.searchParams.get("variant") ?? "lunch") as Variant;
  if (variant !== "lunch" && variant !== "dinner") {
    return NextResponse.json({ error: "invalid variant" }, { status: 400 });
  }

  const admin = supabaseService();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("morning_briefing", true);
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  let sent = 0;
  let skippedDone = 0;

  for (const userId of userIds) {
    const { data: profile } = await admin
      .from("profiles")
      .select("household_id, timezone")
      .eq("id", userId)
      .maybeSingle<{ household_id: string | null; timezone: string | null }>();
    if (!profile?.household_id) continue;

    const today = todayInTz(profile.timezone);
    const { data: lockRow } = await admin
      .from("daily_focus")
      .select("item_ids")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle<{ item_ids: string[] }>();

    if (!lockRow || lockRow.item_ids.length === 0) continue; // nothing locked yet today

    const numberOneId = lockRow.item_ids[0];
    const { data: item } = await admin
      .from("items")
      .select("id, title, status")
      .eq("id", numberOneId)
      .maybeSingle<Pick<Item, "id" | "title" | "status">>();
    if (!item) continue;
    if (item.status === "done") {
      skippedDone++;
      continue;
    }

    const copy = COPY[variant];
    const r = await sendToUser(
      userId,
      {
        title: copy.title(item.title),
        body: copy.body,
        url: "/",
        tag: `nudge-${variant}`,
      },
      "morning_briefing",
    );
    sent += r.sent;
  }

  return NextResponse.json({ users: userIds.length, sent, variant, skipped_done: skippedDone });
}
