import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const completed_on = todayIso();
  const { data, error } = await supabase
    .from("habit_completions")
    .upsert(
      { habit_id: id, user_id: user.id, completed_on, completed_at: new Date().toISOString() },
      { onConflict: "habit_id,completed_on" },
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ completion: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .eq("completed_on", todayIso());
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
