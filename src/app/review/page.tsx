import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function ReviewPage() {
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
          <p className="mt-1 text-4xl font-bold tracking-tight text-white">14</p>
          <p className="text-xs text-white/55">items completed</p>
        </GlassCard>
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">completion</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-accent-gradient bg-accent-gradient bg-clip-text">
            68%
          </p>
          <p className="text-xs text-white/55">of planned</p>
        </GlassCard>
      </section>
      <section className="px-4 pt-3 pb-32">
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">streak</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-amber-200">12 days</p>
          <p className="mt-2 text-xs text-white/55">Plan next week ↗</p>
        </GlassCard>
      </section>
    </main>
  );
}
