import { NextResponse } from "next/server";
import { authUrl } from "@/lib/google";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = authUrl(user.id);
  return NextResponse.redirect(url);
}
