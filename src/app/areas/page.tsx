import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { BalanceWheel } from "@/components/glass/BalanceWheel";
import { LIFE_AREAS, LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { computeAreaDistribution } from "@/lib/priority";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const householdId = await getCurrentHouseholdId();
  let dist: Partial<Record<LifeAreaKey, number>> = {
    family: 14, health: 24, home: 28, career: 8, money: 6, growth: 14, creative: 6,
  };
  let principlesCount = 0;
  if (householdId) {
    const supabase = await supabaseServer();
    const [{ data: items }, { count }] = await Promise.all([
      supabase.from("items").select("*").eq("household_id", householdId),
      supabase
        .from("principles")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("active", true),
    ]);
    dist = computeAreaDistribution((items ?? []) as any);
    principlesCount = count ?? 0;
  }

  return (
    <main>
      <PageHeader
        eyebrow="life balance"
        title="Where your time is going"
        description="Each spoke is your share vs. its target. Neglected areas bubble up the queue."
      />
      <section className="grid place-items-center px-4 pt-5">
        <GlassCard inset className="grid place-items-center">
          <BalanceWheel actualPct={dist} />
        </GlassCard>
      </section>
      <section className="px-4 pt-5">
        <div className="space-y-2">
          {LIFE_AREA_KEYS.map((k) => {
            const target = LIFE_AREAS[k].targetWeeklyPct;
            const actual = dist[k] ?? 0;
            const pct = Math.min(100, (actual / target) * 100);
            return (
              <Link href={`/boards?area=${k}`} key={k}>
                <GlassCard inset className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: LIFE_AREAS[k].color }} />
                      <span className="text-sm font-medium text-white/90">{LIFE_AREAS[k].name}</span>
                    </div>
                    <span className="tabular-nums text-xs text-white/50">
                      {actual}% / {target}% target
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-white/5">
                    <div
                      className="h-full rounded-pill"
                      style={{ width: `${pct}%`, background: LIFE_AREAS[k].color }}
                    />
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 pt-5 pb-32">
        <GlassCard inset variant="subtle" className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">deck</p>
            <p className="mt-1 font-medium text-white">{principlesCount} principles</p>
            <p className="text-xs text-white/55">rotated daily on the Drive</p>
          </div>
          <Link href="/areas/principles" className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            manage
          </Link>
        </GlassCard>
      </section>
    </main>
  );
}
