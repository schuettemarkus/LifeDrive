import Link from "next/link";
import { DailyDriveHeader } from "@/components/drive/DailyDriveHeader";
import { TodaysFocus } from "@/components/drive/TodaysFocus";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { PrincipleCard } from "@/components/drive/PrincipleCard";
import { WorkoutCard } from "@/components/drive/WorkoutCard";
import { GlassCard } from "@/components/glass/GlassCard";
import { PageHeader } from "@/components/glass/PageHeader";
import {
  MOCK_BLOCKS,
  MOCK_PRINCIPLE,
  MOCK_RESTING,
  MOCK_STREAK,
  MOCK_TODAYS_THREE,
  MOCK_WORKOUT,
  type MockBlock,
  type MockItem,
} from "@/lib/mock-data";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { todaysThree, computeAreaDistribution } from "@/lib/priority";
import { startOfDay } from "@/lib/utils";
import type { LifeAreaKey } from "@/lib/design";

export const dynamic = "force-dynamic";

export default async function DailyDrivePage() {
  const householdId = await getCurrentHouseholdId();

  // Demo / unauth mode — render the mock Daily Drive so the surface stays beautiful.
  if (!householdId) {
    return (
      <main className="flex flex-col">
        <DailyDriveHeader name="friend" streak={MOCK_STREAK} resting={MOCK_RESTING} />
        <section className="px-4 pt-5">
          <Link
            href="/auth/sign-in"
            className="block rounded-glass border border-accent-violet/40 bg-accent-gradient/10 p-4 text-center text-sm font-semibold text-white shadow-glow"
          >
            sign in to use your real list →
          </Link>
        </section>
        <TodaysFocus items={MOCK_TODAYS_THREE} />
        <ScheduleStrip blocks={MOCK_BLOCKS} />
        <PrincipleCard text={MOCK_PRINCIPLE.text} group={MOCK_PRINCIPLE.group} />
        <WorkoutCard name={MOCK_WORKOUT.name} exercises={MOCK_WORKOUT.exercises} />
      </main>
    );
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: items }, { data: profile }, { data: principles }, { data: workouts }, { data: blocks }] =
    await Promise.all([
      supabase.from("items").select("*").eq("household_id", householdId),
      supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle(),
      supabase
        .from("principles")
        .select("*")
        .eq("household_id", householdId)
        .eq("active", true)
        .order("last_shown_at", { ascending: true, nullsFirst: true })
        .limit(1),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user!.id)
        .eq("scheduled_for", new Date().toISOString().slice(0, 10))
        .limit(1),
      supabase
        .from("schedule_blocks")
        .select("*, items!inner(title, life_area)")
        .eq("user_id", user!.id)
        .gte("starts_at", startOfDay().toISOString())
        .lte("starts_at", new Date(Date.now() + 24 * 3600 * 1000).toISOString())
        .order("starts_at", { ascending: true }),
    ]);

  const allItems = items ?? [];
  const distribution = computeAreaDistribution(allItems as any);
  const top = todaysThree(allItems as any, distribution);

  const blockRows = (blocks ?? []) as Array<{
    id: string;
    item_id: string;
    starts_at: string;
    ends_at: string;
    items?: { title: string; life_area: string | null } | null;
  }>;
  const focusItems: MockItem[] = top.map((it) => {
    const block = blockRows.find((b) => b.item_id === it.id);
    return {
      id: it.id,
      title: it.title,
      notes: it.notes ?? undefined,
      area: (it.life_area as LifeAreaKey) ?? "growth",
      effortMinutes: it.effort_minutes ?? 30,
      reason: it.computed.reasons.join(" · ") || it.priority_reason || "ranked by score",
      scheduledStart: block?.starts_at,
      scheduledEnd: block?.ends_at,
      isNextAction: it.is_next_action,
    };
  });

  const scheduleBlocks: MockBlock[] = blockRows.map((b) => ({
    id: b.id,
    kind: "focus",
    title: b.items?.title ?? "focus",
    area: (b.items?.life_area as LifeAreaKey | null) ?? undefined,
    start: b.starts_at,
    end: b.ends_at,
  }));

  const resting = allItems.filter((i: any) => i.status !== "done" && i.status !== "someday").length - top.length;

  const principle = principles?.[0];
  const workout = workouts?.[0];

  return (
    <main className="flex flex-col">
      <DailyDriveHeader
        name={profile?.display_name?.split(" ")[0] ?? "friend"}
        streak={MOCK_STREAK}
        resting={Math.max(0, resting)}
      />
      {focusItems.length > 0 ? (
        <TodaysFocus items={focusItems} />
      ) : (
        <section className="px-4 pt-6">
          <PageHeader title="Quiet drive" description="Nothing pressing today. Drop a quick capture if you have ideas resting." />
        </section>
      )}
      {scheduleBlocks.length > 0 && <ScheduleStrip blocks={scheduleBlocks} />}
      {principle && (
        <PrincipleCard text={principle.text} group={principle.theme ?? "principle"} />
      )}
      {workout && <WorkoutCard name={workout.name} exercises={workout.exercises ?? []} />}
      {!workout && (
        <section className="mb-28 px-4 pt-5">
          <GlassCard inset variant="subtle">
            <p className="text-xs text-white/55">
              Today's workout will appear once you've seeded your weekly split.
            </p>
          </GlassCard>
        </section>
      )}
    </main>
  );
}
