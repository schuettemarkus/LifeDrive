import Link from "next/link";
import { DailyDriveHeader } from "@/components/drive/DailyDriveHeader";
import { TodaysFocus } from "@/components/drive/TodaysFocus";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { PrincipleCard } from "@/components/drive/PrincipleCard";
import { TodaysHabits } from "@/components/drive/TodaysHabits";
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
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  // Unauthenticated — render the mock Daily Drive so the surface stays beautiful.
  if (!signedIn) {
    return (
      <main className="flex flex-col">
        <DailyDriveHeader name="friend" streak={MOCK_STREAK} resting={MOCK_RESTING} signedIn={false} />
        <section className="px-4 pt-5">
          <Link
            href="/auth/sign-in"
            className="block rounded-glass border border-accent-violet/40 bg-accent-gradient/10 p-4 text-center text-sm font-semibold text-white shadow-glow"
          >
            sign in to use your real list →
          </Link>
        </section>
        <PrincipleCard text={MOCK_PRINCIPLE.text} group={MOCK_PRINCIPLE.group} />
        <TodaysFocus items={MOCK_TODAYS_THREE} />
        <ScheduleStrip blocks={MOCK_BLOCKS} density="compact" />
        <WorkoutCard name={MOCK_WORKOUT.name} exercises={MOCK_WORKOUT.exercises} />
      </main>
    );
  }

  // Signed in but no household — finish onboarding before showing real data.
  if (!householdId) {
    const firstName =
      (user?.user_metadata as { full_name?: string; name?: string })?.full_name ??
      (user?.user_metadata as { name?: string })?.name ??
      user?.email?.split("@")[0] ??
      "friend";
    return (
      <main className="flex flex-col">
        <DailyDriveHeader
          name={firstName.split(" ")[0]}
          streak={0}
          resting={0}
          signedIn
        />
        <section className="px-4 pt-6 space-y-3 pb-32">
          <GlassCard inset variant="strong" className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">welcome</p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              You're signed in. Let's load your life.
            </h2>
            <p className="text-sm text-white/65">
              Run the one-time seed locally to create your <strong>Home base</strong> household and import your
              projects, tasks, principles, and workout split.
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-emerald-200">
              <code>SEED_OWNER_EMAIL={user?.email ?? "you@example.com"} npm run seed</code>
            </pre>
            <p className="text-[11px] text-white/45">
              Or create an empty household and start fresh:
            </p>
            <Link
              href="/onboarding/household"
              className="inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              create household
            </Link>
          </GlassCard>
          <PrincipleCard text={MOCK_PRINCIPLE.text} group={MOCK_PRINCIPLE.group} />
        </section>
      </main>
    );
  }

  const todayDow = new Date().getDay();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [
    { data: items },
    { data: profile },
    { data: principles },
    { data: workouts },
    { data: blocks },
    { data: habits },
    { data: habitCompletions },
  ] = await Promise.all([
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
      .eq("scheduled_for", todayIso)
      .limit(1),
    supabase
      .from("schedule_blocks")
      .select("*, items!inner(title, life_area)")
      .eq("user_id", user!.id)
      .gte("starts_at", startOfDay().toISOString())
      .lte("starts_at", new Date(Date.now() + 24 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user!.id)
      .eq("active", true)
      .contains("days_of_week", [todayDow])
      .order("position", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user!.id)
      .eq("completed_on", todayIso),
  ]);

  const allItems = items ?? [];
  const distribution = computeAreaDistribution(allItems as any);
  const top = todaysThree(allItems as any, distribution);

  type BlockRow = {
    id: string;
    item_id: string;
    starts_at: string;
    ends_at: string;
    items?: { title: string; life_area: string | null }[] | { title: string; life_area: string | null } | null;
  };
  const blockRows = (blocks ?? []) as unknown as BlockRow[];
  const blockItem = (b: BlockRow) =>
    Array.isArray(b.items) ? b.items[0] ?? null : b.items ?? null;
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

  const scheduleBlocks: MockBlock[] = blockRows.map((b) => {
    const item = blockItem(b);
    return {
      id: b.id,
      kind: "focus" as const,
      title: item?.title ?? "focus",
      area: (item?.life_area as LifeAreaKey | null) ?? undefined,
      start: b.starts_at,
      end: b.ends_at,
    };
  });

  const resting = allItems.filter((i: any) => i.status !== "done" && i.status !== "someday").length - top.length;

  const principle = principles?.[0];
  const workout = workouts?.[0];

  if (principle) {
    // Fire-and-forget: stamp the rotation so we don't repeat tomorrow.
    void supabase
      .from("principles")
      .update({ last_shown_at: new Date().toISOString() })
      .eq("id", principle.id);
  }

  return (
    <main className="flex flex-col">
      <DailyDriveHeader
        name={profile?.display_name?.split(" ")[0] ?? "friend"}
        streak={MOCK_STREAK}
        resting={Math.max(0, resting)}
        signedIn
      />
      {principle && (
        <PrincipleCard
          id={principle.id}
          text={principle.text}
          group={principle.theme ?? "principle"}
          lesson={principle.lesson ?? null}
        />
      )}
      {focusItems.length > 0 ? (
        <TodaysFocus items={focusItems} />
      ) : (
        <section className="px-4 pt-6">
          <PageHeader title="Quiet drive" description="Nothing pressing today. Drop a quick capture if you have ideas resting." />
        </section>
      )}
      <TodaysHabits habits={(habits ?? []) as any} completions={(habitCompletions ?? []) as any} />
      {scheduleBlocks.length > 0 && <ScheduleStrip blocks={scheduleBlocks} density="compact" />}
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
