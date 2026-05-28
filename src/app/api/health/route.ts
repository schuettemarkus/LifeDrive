import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "life-drive",
    time: new Date().toISOString(),
    env: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
    },
  });
}
