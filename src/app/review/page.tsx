import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { BalanceWheel } from "@/components/glass/BalanceWheel";
import { LIFE_AREAS, LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { computeAreaDistribution } from "@/lib/priority";
import { startOfWeek } from "@/lib/utils";
import { StageNextWeekButton } from "@/components/review/StageNextWeekButton";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const householdId = await getCurrentHouseholdId();

  let shipped = 0;
  let plannedThisWeek = 0;
  let completionPct = 0;
  let dist: Partial<Record<LifeAreaKey, number>> = {};

  if (householdId) {
    const supabase = await supabaseServer();
    const weekStart = startOfWeek();
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);

    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("household_id", householdId);
    const all = (items ?? []) as any[];

    shipped = all.filter(
      (i) =>
        i.completed_at &&
        new Date(i.completed_at) >= weekStart &&
        new Date(i.completed_at) < nextWeek,
    ).length;
    plannedThisWeek = all.filter((i) => i.status === "this_week" || i.status === "doing").length;
    const totalAttempted = shipped + plannedThisWeek;
    completionPct = totalAttempted > 0 ? Math.round((shipped / totalAttempted) * 100) : 0;
    dist = computeAreaDistribution(all);
  }

  return (
    <main>
      <PageHeader
        eyebrow="weekly review"
        title="This week"
        description="What you shipped, where you leaned, what's next."
      />
      <section className="grid grid-cols-2 gap-3 px-4 pt-5">
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">shipped</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-white">{shipped}</p>
          <p className="text-xs text-white/55">items completed</p>
        </GlassCard>
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">completion</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-accent-gradient bg-accent-gradient bg-clip-text">
            {completionPct}%
          </p>
          <p className="text-xs text-white/55">of planned</p>
        </GlassCard>
      </section>

      <section className="grid place-items-center px-4 pt-5">
        <GlassCard inset className="grid place-items-center">
          <BalanceWheel actualPct={dist} />
        </GlassCard>
      </section>

      <section className="px-4 pt-5 pb-32 space-y-3">
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">balance shifts</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            {LIFE_AREA_KEYS.map((k) => {
              const actual = dist[k] ?? 0;
              const target = LIFE_AREAS[k].targetWeeklyPct;
              const delta = actual - target;
              return (
                <li key={k} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: LIFE_AREAS[k].color }} />
                    <span className="text-white/80">{LIFE_AREAS[k].name}</span>
                  </div>
                  <span className={delta >= 0 ? "text-emerald-300" : "text-amber-300"}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </GlassCard>

        <GlassCard inset>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">set up next week</p>
              <p className="mt-1 font-medium text-white">Stage the top of the queue</p>
              <p className="text-xs text-white/55">Pulls the top {plannedThisWeek > 0 ? "candidates" : "ranked items"} into "this week".</p>
            </div>
            <StageNextWeekButton />
          </div>
        </GlassCard>

        <Link href="/areas" className="block text-center text-xs text-accent-cyan">
          tune areas + targets ↗
        </Link>
      </section>
    </main>
  );
}
