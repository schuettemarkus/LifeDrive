import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  user_agent: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = schema.parse(await req.json());
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth_key: body.keys.auth,
          user_agent: body.user_agent ?? null,
        },
        { onConflict: "user_id,endpoint" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ subscription: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "subscribe_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
