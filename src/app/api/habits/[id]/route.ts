import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const patchSchema = z.object({
  title: z.string().min(1).max(140).trim().optional(),
  notes: z.string().max(2000).nullable().optional(),
  life_area: z.string().max(40).nullable().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  time_of_day: z.enum(["morning", "midday", "evening", "anytime"]).optional(),
  icon: z.string().max(8).nullable().optional(),
  position: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const patch = patchSchema.parse(await req.json());
    const { data, error } = await supabase
      .from("habits")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ habit: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "habit_patch_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
