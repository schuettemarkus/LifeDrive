import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { createItem, listItems } from "@/lib/items";
import { requireCurrentUserAndHousehold } from "@/lib/household";

const createSchema = z.object({
  title: z.string().min(1).max(280),
  notes: z.string().optional(),
  life_area: z.string().optional(),
  effort_minutes: z.number().int().positive().optional(),
  impact: z.number().int().min(1).max(5).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  type: z.enum(["task", "project"]).optional(),
  parent_id: z.string().uuid().optional(),
  status: z.enum(["inbox", "backlog", "this_week", "doing", "done", "someday"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { householdId, supabase } = await requireCurrentUserAndHousehold();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const area = url.searchParams.get("area") ?? undefined;
    const items = await listItems(supabase, householdId, {
      status: status as any,
      area: area ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { householdId, user, supabase } = await requireCurrentUserAndHousehold();
    const body = createSchema.parse(await req.json());
    const item = await createItem(supabase, {
      household_id: householdId,
      ...body,
    });
    // attach created_by via a follow-up update — items.created_by is set by the trigger when null; this ensures it.
    await supabase.from("items").update({ created_by: user.id }).eq("id", item.id);
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
