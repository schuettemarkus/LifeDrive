import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { GlassCard } from "@/components/glass/GlassCard";
import { EventStrip } from "@/components/calendar/EventStrip";
import { AutoPlanner } from "@/components/calendar/AutoPlanner";
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
        description="Full day · focus blocks live alongside your real meetings."
      />
      {connected ? <EventStrip fullDay /> : <ScheduleStrip blocks={MOCK_BLOCKS} fullDay />}
      <AutoPlanner enabled={connected} />
      {!connected && (
        <section className="px-4 pt-5 pb-32">
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
        </section>
      )}
      <div className="pb-32" />
    </main>
  );
}
