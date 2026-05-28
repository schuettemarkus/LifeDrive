import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const patchSchema = z.object({
  title: z.string().min(1).max(280).optional(),
  notes: z.string().nullable().optional(),
  life_area: z.string().nullable().optional(),
  effort_minutes: z.number().int().positive().nullable().optional(),
  impact: z.number().int().min(1).max(5).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  due_date: z.string().nullable().optional(),
  status: z.enum(["inbox", "backlog", "this_week", "doing", "done", "someday"]).optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "household"]).optional(),
  is_next_action: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const patch = patchSchema.parse(await req.json());
    const enrichedPatch: typeof patch & { completed_at?: string | null } = { ...patch };
    if (patch.status === "done") enrichedPatch.completed_at = new Date().toISOString();
    if (patch.status && patch.status !== "done") enrichedPatch.completed_at = null;

    const { data, error } = await supabase
      .from("items")
      .update(enrichedPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
