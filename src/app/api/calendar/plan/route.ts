import { NextResponse } from "next/server";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { planForUser } from "@/lib/auto-plan";

export async function POST() {
  try {
    const { user, householdId, supabase } = await requireCurrentUserAndHousehold();
    const result = await planForUser({
      supabase,
      userId: user.id,
      householdId,
      commit: false,
    });
    return NextResponse.json({ proposed: result.proposed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "plan_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
