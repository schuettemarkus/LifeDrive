import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";
import { computeAreaDistribution, todaysThree } from "@/lib/priority";

/**
 * Cron entry point. Called by Vercel Cron (vercel.json) every morning.
 * Must present `Authorization: Bearer ${PUSH_CRON_SECRET}` or it returns 401.
 *
 * For every user with push enabled, sends:
 *   "today's principle · 3 focus items · habits + workout summary"
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

// Vercel Cron uses GET by default. Accept both.
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
      .select("household_id, display_name")
      .eq("id", userId)
      .maybeSingle<{ household_id: string | null; display_name: string | null }>();
    if (!profile?.household_id) continue;

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayDow = new Date().getDay();
    const [{ data: items }, { data: principles }, { data: habits }, { data: workouts }] = await Promise.all([
      admin.from("items").select("*").eq("household_id", profile.household_id),
      admin
        .from("principles")
        .select("*")
        .eq("household_id", profile.household_id)
        .eq("active", true)
        .order("last_shown_at", { ascending: true, nullsFirst: true })
        .limit(1),
      admin
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true)
        .contains("days_of_week", [todayDow]),
      admin
        .from("workouts")
        .select("name")
        .eq("user_id", userId)
        .eq("scheduled_for", todayIso)
        .limit(1),
    ]);

    const dist = computeAreaDistribution((items ?? []) as any);
    const top = todaysThree((items ?? []) as any, dist);
    const first = top[0];
    const principle = (principles ?? [])[0] as { text: string } | undefined;

    const parts: string[] = [];
    if (first) parts.push(`#1: ${first.title}`);
    if ((habits ?? []).length > 0) parts.push(`${(habits ?? []).length} habits`);
    if ((workouts ?? []).length > 0) parts.push(`${(workouts as any)[0].name} workout`);
    const body = parts.join(" · ") || "Open Life Drive to plan your day.";
    const title = principle ? principle.text.slice(0, 64) : "Today's Drive";

    const r = await sendToUser(userId, { title, body, url: "/", tag: "morning" }, "morning_briefing");
    sent += r.sent;
  }

  return NextResponse.json({ users: userIds.length, sent });
}
