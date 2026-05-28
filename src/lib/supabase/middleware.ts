import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const PROTECTED = ["/", "/boards", "/calendar", "/review", "/areas", "/capture", "/item", "/settings"];
const PUBLIC_PREFIXES = ["/auth", "/onboarding", "/_next", "/api/health", "/manifest.webmanifest", "/favicon", "/icon-", "/sw.js"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });

  // Without env vars (e.g. preview deploys), let everything through. The
  // protected routes will fall back to empty states.
  if (!url || !anon) return response;

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  const isProtected = !isPublic && PROTECTED.some((p) => (p === "/" ? path === "/" : path.startsWith(p)));

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/sign-in";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
