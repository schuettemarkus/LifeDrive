import { PageHeader } from "@/components/glass/PageHeader";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { GlassCard } from "@/components/glass/GlassCard";
import { MOCK_BLOCKS } from "@/lib/mock-data";

export default function CalendarPage() {
  return (
    <main>
      <PageHeader
        eyebrow="calendar"
        title="Today"
        description="Focus blocks live alongside your real meetings."
      />
      <ScheduleStrip blocks={MOCK_BLOCKS} />
      <section className="px-4 pt-5 pb-32">
        <GlassCard inset className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">auto-schedule</p>
            <p className="mt-1 font-medium text-white/90">Plan my day</p>
            <p className="text-xs text-white/50">Fill focus windows with the top of the queue.</p>
          </div>
          <button className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow">
            plan
          </button>
        </GlassCard>
      </section>
    </main>
  );
}
