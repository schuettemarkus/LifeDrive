import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { createEvent } from "@/lib/google";
import type { Item, ScheduleBlock } from "@/types/database";

const schema = z.object({
  block_ids: z.array(z.string()).min(1).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireCurrentUserAndHousehold();
    const body = schema.parse(await req.json().catch(() => ({})));

    // Get the blocks to accept. Default: all currently 'proposed' for this user.
    let query = supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "proposed");
    if (body.block_ids?.length) query = query.in("id", body.block_ids);
    const { data: blocks, error } = await query;
    if (error) throw error;
    if (!blocks || blocks.length === 0) return NextResponse.json({ accepted: 0 });

    const typed = blocks as ScheduleBlock[];
    const itemIds = Array.from(new Set(typed.map((b) => b.item_id)));
    const { data: items } = await supabase
      .from("items")
      .select("id, title, life_area, notes")
      .in("id", itemIds);
    const byId = new Map<string, Pick<Item, "id" | "title" | "life_area" | "notes">>(
      ((items ?? []) as Array<Pick<Item, "id" | "title" | "life_area" | "notes">>).map((i) => [i.id, i]),
    );

    let written = 0;
    for (const b of typed) {
      const item = byId.get(b.item_id);
      if (!item) continue;
      try {
        const event = await createEvent(user.id, {
          summary: `🎯 ${item.title}`,
          description: `Life Drive focus block — ${item.life_area ?? ""}\n\n${item.notes ?? ""}`.trim(),
          start: new Date(b.starts_at),
          end: new Date(b.ends_at),
          itemId: item.id,
        });
        await supabase
          .from("schedule_blocks")
          .update({
            status: "accepted",
            google_event_id: event.id ?? null,
          })
          .eq("id", b.id);
        written++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "google_error";
        await supabase
          .from("schedule_blocks")
          .update({ status: "skipped" })
          .eq("id", b.id);
        // Continue with other blocks; surface the last error in the response if all fail.
        console.error(`Failed to write event for block ${b.id}: ${msg}`);
      }
    }
    return NextResponse.json({ accepted: written });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "accept_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
