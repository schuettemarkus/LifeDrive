import { NextResponse } from "next/server";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { computeAreaDistribution, rankItems } from "@/lib/priority";

const STAGE_COUNT = 12;

export async function POST() {
  try {
    const { householdId, supabase } = await requireCurrentUserAndHousehold();
    const { data: items, error } = await supabase
      .from("items")
      .select("*")
      .eq("household_id", householdId);
    if (error) throw error;
    const all = (items ?? []) as any[];
    const dist = computeAreaDistribution(all);
    const ranked = rankItems(all, dist).filter((i) => i.status === "backlog");
    const targets = ranked.slice(0, STAGE_COUNT);
    if (targets.length === 0) return NextResponse.json({ staged: 0 });
    const ids = targets.map((t) => t.id);
    const { error: updErr } = await supabase
      .from("items")
      .update({ status: "this_week" })
      .in("id", ids);
    if (updErr) throw updErr;
    return NextResponse.json({ staged: ids.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stage_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
