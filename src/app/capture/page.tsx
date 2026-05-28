import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function CapturePage() {
  return (
    <main>
      <PageHeader
        eyebrow="brain dump"
        title="What's on your mind?"
        description="Type or dictate everything. The AI sorts, estimates, and parks it where it belongs."
      />
      <section className="px-4 pt-5">
        <GlassCard inset>
          <textarea
            placeholder="One item per line. Hit triage when you're done."
            rows={10}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
          />
        </GlassCard>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
          >
            voice
          </button>
          <button
            type="button"
            className="rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow"
          >
            triage
          </button>
        </div>
      </section>
    </main>
  );
}
