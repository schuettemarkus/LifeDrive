import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.PUSH_CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return run();
}

async function run() {
  const admin = supabaseService();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("evening_review", true);
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  let sent = 0;

  for (const userId of userIds) {
    const { data: profile } = await admin
      .from("profiles")
      .select("household_id")
      .eq("id", userId)
      .maybeSingle<{ household_id: string | null }>();
    if (!profile?.household_id) continue;

    // Items still in this_week or doing that aren't done.
    const { data: pending } = await admin
      .from("items")
      .select("id, title, status, is_next_action")
      .eq("household_id", profile.household_id)
      .in("status", ["this_week", "doing"])
      .order("priority_score", { ascending: false })
      .limit(3);

    const list = (pending ?? []) as { title: string }[];
    if (list.length === 0) {
      const r = await sendToUser(
        userId,
        { title: "Quiet day, shipped 👏", body: "Nothing resting. Rest well — tomorrow's plan loads at 6am.", url: "/", tag: "evening" },
        "evening_review",
      );
      sent += r.sent;
      continue;
    }
    const body =
      list.length === 1
        ? `1 still resting: ${list[0].title}`
        : `${list.length} still resting: ${list.map((p) => p.title).slice(0, 2).join(", ")}${list.length > 2 ? "…" : ""}`;
    const r = await sendToUser(
      userId,
      { title: "How'd today go?", body, url: "/review", tag: "evening" },
      "evening_review",
    );
    sent += r.sent;
  }

  return NextResponse.json({ users: userIds.length, sent });
}
