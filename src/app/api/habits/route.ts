import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserAndHousehold } from "@/lib/household";

const createSchema = z.object({
  title: z.string().min(1).max(140).trim(),
  notes: z.string().max(2000).optional(),
  life_area: z.string().max(40).nullable().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  time_of_day: z.enum(["morning", "midday", "evening", "anytime"]).optional(),
  icon: z.string().max(8).nullable().optional(),
});

export async function GET() {
  try {
    const { user, supabase } = await requireCurrentUserAndHousehold();
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const [{ data: habits }, { data: completions }] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed_on", todayIso),
    ]);
    return NextResponse.json({ habits: habits ?? [], completions: completions ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "habits_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, householdId, supabase } = await requireCurrentUserAndHousehold();
    const body = createSchema.parse(await req.json());
    const { data: existing } = await supabase
      .from("habits")
      .select("position")
      .eq("user_id", user.id)
      .order("position", { ascending: false })
      .limit(1);
    const nextPosition = existing && existing.length > 0
      ? ((existing[0] as { position: number }).position ?? 0) + 1
      : 0;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        household_id: householdId,
        user_id: user.id,
        title: body.title,
        notes: body.notes ?? null,
        life_area: body.life_area ?? null,
        days_of_week: body.days_of_week,
        time_of_day: body.time_of_day ?? "anytime",
        icon: body.icon ?? null,
        position: nextPosition,
        active: true,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ habit: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "habit_create_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
