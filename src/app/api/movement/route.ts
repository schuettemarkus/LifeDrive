import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const KINDS = ["workout", "pickleball", "stretch", "walk", "yard_work", "bike", "other"] as const;

const createSchema = z.object({
  kind: z.enum(KINDS),
  custom_label: z.string().max(80).nullable().optional(),
  notes: z.string().max(280).nullable().optional(),
  duration_min: z.number().int().positive().max(600).nullable().optional(),
});

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(180, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10)));
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("movement_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("day", cutoff)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const body = createSchema.parse(await req.json());
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("movement_logs")
      .insert({
        user_id: user.id,
        day: today,
        kind: body.kind,
        custom_label: body.custom_label ?? null,
        notes: body.notes ?? null,
        duration_min: body.duration_min ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ log: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
