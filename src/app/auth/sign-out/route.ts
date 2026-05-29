import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // 303 forces the browser to issue GET on the destination — otherwise the
  // form POST is preserved and the sign-in page returns 405.
  return NextResponse.redirect(new URL("/auth/sign-in", request.url), 303);
}

export const POST = signOutAndRedirect;
export const GET = signOutAndRedirect;
