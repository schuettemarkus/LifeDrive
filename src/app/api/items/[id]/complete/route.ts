import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteEvent } from "@/lib/google";
import type { ScheduleBlock } from "@/types/database";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    await supabase
      .from("items")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id);

    // Drop any scheduled blocks + their Google events. Only events we created.
    const { data: blocks } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("item_id", id);
    for (const b of (blocks ?? []) as ScheduleBlock[]) {
      if (b.google_event_id) {
        try {
          await deleteEvent(user.id, b.google_event_id);
        } catch {
          /* event may already be gone */
        }
      }
      await supabase
        .from("schedule_blocks")
        .update({ status: "done" })
        .eq("id", b.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "complete_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
