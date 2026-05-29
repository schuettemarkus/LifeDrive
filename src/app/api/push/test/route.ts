import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendToUser } from "@/lib/push";

/**
 * POST /api/push/test — sends a smoke-test push to all of the caller's
 * subscriptions. Used by the Settings page after the user enables push.
 */
export async function POST() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const result = await sendToUser(user.id, {
      title: "Life Drive",
      body: "Notifications are on. See you at 6am.",
      url: "/",
      tag: "test",
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "push_error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
