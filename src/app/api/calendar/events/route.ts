import { NextResponse } from "next/server";
import { listEvents } from "@/lib/google";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const timeMin = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));
  const timeMax = end ? new Date(end) : new Date(timeMin.getTime() + 24 * 3600 * 1000);

  try {
    const events = await listEvents(user.id, timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "calendar_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
