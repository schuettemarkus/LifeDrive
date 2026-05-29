import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM 24-hour");

const focusWindow = z.object({
  start: hhmm,
  end: hhmm,
  label: z.string().max(40).optional(),
});

const patchSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  timezone: z.string().min(2).max(64).optional(),
  working_hours: z.object({ start: hhmm, end: hhmm }).optional(),
  focus_windows: z.array(focusWindow).max(6).optional(),
});

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const patch = patchSchema.parse(await req.json());

    // Validate windows: end > start.
    if (patch.focus_windows) {
      for (const w of patch.focus_windows) {
        if (w.end <= w.start) {
          return NextResponse.json(
            { error: `Focus window end (${w.end}) must be after start (${w.start})` },
            { status: 400 },
          );
        }
      }
    }
    if (patch.working_hours && patch.working_hours.end <= patch.working_hours.start) {
      return NextResponse.json(
        { error: "Working hours end must be after start" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
