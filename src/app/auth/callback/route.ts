import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=missing_code", url.origin));
  }

  const supabase = await supabaseServer();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // If we received a Google provider session with offline access, persist tokens
  // server-side so the calendar features can refresh later. Service role bypasses
  // RLS for `google_accounts`.
  try {
    const providerToken = (data?.session as any)?.provider_token as string | undefined;
    const providerRefresh = (data?.session as any)?.provider_refresh_token as string | undefined;
    const userId = data?.user?.id;
    const googleSub = (data?.user?.user_metadata as any)?.sub as string | undefined;
    if (providerToken && providerRefresh && userId && googleSub) {
      const admin = supabaseService();
      await admin.from("google_accounts").upsert(
        {
          user_id: userId,
          google_sub: googleSub,
          access_token: providerToken,
          refresh_token: providerRefresh,
          token_expiry: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
          scopes: ["openid", "email", "profile", "calendar.readonly", "calendar.events"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  } catch {
    /* don't block sign-in on calendar persistence */
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
