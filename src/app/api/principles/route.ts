import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserAndHousehold } from "@/lib/household";

const schema = z.object({
  text: z.string().min(3).max(500),
  theme: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const { user, householdId, supabase } = await requireCurrentUserAndHousehold();
    const { text, theme } = schema.parse(await req.json());
    const { data, error } = await supabase
      .from("principles")
      .upsert(
        { household_id: householdId, author_id: user.id, text, theme: theme ?? null, active: true },
        { onConflict: "household_id,text" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ principle: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "principles_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
