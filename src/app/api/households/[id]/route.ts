import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import type { Household } from "@/types/database";

const schema = z.object({ name: z.string().min(1).max(80).trim() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    // Caller must be an owner of this household.
    const { data: membership } = await supabase
      .from("household_members")
      .select("role")
      .eq("household_id", id)
      .eq("user_id", user.id)
      .maybeSingle<{ role: "owner" | "member" }>();
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only owners can rename the household" }, { status: 403 });
    }

    const { name } = schema.parse(await req.json());
    // Use service role to bypass any RLS quirks on update (membership check above is the gate).
    const admin = supabaseService();
    const { data, error } = await admin
      .from("households")
      .update({ name })
      .eq("id", id)
      .select("*")
      .single<Household>();
    if (error) throw error;
    return NextResponse.json({ household: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "rename_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
