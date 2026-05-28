import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, persistTokensForUser } from "@/lib/google";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return NextResponse.redirect(new URL("/settings?google=error", url.origin));

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (state && state !== user.id)) {
    return NextResponse.redirect(new URL("/auth/sign-in?next=/settings", url.origin));
  }
  try {
    const tokens = await exchangeCode(code);
    await persistTokensForUser(user.id, tokens);
    return NextResponse.redirect(new URL("/settings?google=connected", url.origin));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "google_error";
    return NextResponse.redirect(new URL(`/settings?google=${encodeURIComponent(msg)}`, url.origin));
  }
}
