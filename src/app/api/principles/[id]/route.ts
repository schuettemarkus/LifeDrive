import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  text: z.string().min(3).max(500).optional(),
  theme: z.string().max(80).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const patch = schema.parse(await req.json());
    const { data, error } = await supabase
      .from("principles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ principle: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "principles_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("principles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
