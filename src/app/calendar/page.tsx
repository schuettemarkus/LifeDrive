import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { GlassCard } from "@/components/glass/GlassCard";
import { EventStrip } from "@/components/calendar/EventStrip";
import { PlanDayButton } from "@/components/calendar/PlanDayButton";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { MOCK_BLOCKS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let connected = false;
  if (user) {
    const admin = supabaseService();
    const { data } = await admin
      .from("google_accounts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    connected = Boolean(data);
  }

  return (
    <main>
      <PageHeader
        eyebrow="calendar"
        title="Today"
        description="Focus blocks live alongside your real meetings."
      />
      {connected ? <EventStrip /> : <ScheduleStrip blocks={MOCK_BLOCKS} />}
      <section className="px-4 pt-5 pb-32 space-y-3">
        {!connected && (
          <GlassCard inset variant="subtle">
            <p className="text-sm text-white/75">
              Google Calendar isn't connected yet — the schedule above is a preview.
            </p>
            <Link
              href="/api/calendar/oauth"
              className="mt-3 inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              connect calendar
            </Link>
          </GlassCard>
        )}
        <GlassCard inset className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">auto-schedule</p>
            <p className="mt-1 font-medium text-white/90">Plan my day</p>
            <p className="text-xs text-white/50">Fill focus windows with the top of the queue.</p>
          </div>
          <PlanDayButton disabled={!connected} />
        </GlassCard>
      </section>
    </main>
  );
}
