import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <PageHeader eyebrow="item" title={`#${id}`} />
      <section className="px-4 pt-5 pb-32 space-y-3">
        <GlassCard inset>
          <AreaPill area="home" />
          <h2 className="mt-3 text-xl font-semibold text-white">Item detail</h2>
          <p className="mt-1 text-sm text-white/55">
            Subtasks, AI breakdown, scheduling, delegation, and history live here once wired to Supabase.
          </p>
        </GlassCard>
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">break this down</p>
          <button className="mt-2 rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow">
            ask the AI
          </button>
        </GlassCard>
      </section>
    </main>
  );
}
