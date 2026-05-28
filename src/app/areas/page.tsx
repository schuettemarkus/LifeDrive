import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { BalanceWheel } from "@/components/glass/BalanceWheel";
import { LIFE_AREAS, LIFE_AREA_KEYS } from "@/lib/design";

const MOCK_ACTUAL = {
  family: 14,
  health: 24,
  home: 28,
  career: 8,
  money: 6,
  growth: 14,
  creative: 6,
};

export default function AreasPage() {
  return (
    <main>
      <PageHeader
        eyebrow="life balance"
        title="Where your time is going"
        description="Each spoke is the share of your invested time vs. its target."
      />
      <section className="grid place-items-center px-4 pt-5">
        <GlassCard inset className="grid place-items-center">
          <BalanceWheel actualPct={MOCK_ACTUAL} />
        </GlassCard>
      </section>
      <section className="px-4 pt-5 pb-32">
        <div className="space-y-2">
          {LIFE_AREA_KEYS.map((k) => {
            const target = LIFE_AREAS[k].targetWeeklyPct;
            const actual = MOCK_ACTUAL[k];
            const pct = Math.min(100, (actual / target) * 100);
            return (
              <GlassCard key={k} inset className="space-y-1.5">
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
            );
          })}
        </div>
      </section>
    </main>
  );
}
