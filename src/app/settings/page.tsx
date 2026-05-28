import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function SettingsPage() {
  return (
    <main>
      <PageHeader title="Settings" />
      <section className="px-4 pt-5 pb-32 space-y-3">
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">profile</p>
          <p className="mt-1 text-base font-medium text-white">Markus</p>
          <p className="text-xs text-white/55">America/Denver · 6:00–21:00</p>
        </GlassCard>
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">integrations</p>
          <p className="mt-1 font-medium text-white">Google Calendar</p>
          <p className="text-xs text-white/55">not connected</p>
        </GlassCard>
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">household</p>
          <p className="mt-1 font-medium text-white">Home base</p>
          <p className="text-xs text-white/55">2 members</p>
        </GlassCard>
      </section>
    </main>
  );
}
