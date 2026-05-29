import Link from "next/link";
import { DailyDriveHeader } from "@/components/drive/DailyDriveHeader";
import { TodaysFocus } from "@/components/drive/TodaysFocus";
import { UpcomingEvents } from "@/components/drive/UpcomingEvents";
import { PrincipleCard } from "@/components/drive/PrincipleCard";
import { TodaysHabits } from "@/components/drive/TodaysHabits";
import { MovementPicker } from "@/components/drive/MovementPicker";
import { MorningBriefing } from "@/components/drive/MorningBriefing";
import { GlassCard } from "@/components/glass/GlassCard";
import {
  MOCK_PRINCIPLE,
  MOCK_RESTING,
  MOCK_STREAK,
  MOCK_TODAYS_THREE,
  type MockItem,
} from "@/lib/mock-data";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { getStreak } from "@/lib/streak";
import { getOrLockTodaysFocus, todayInTz } from "@/lib/daily-focus";
import type { LifeAreaKey } from "@/lib/design";
import type { Item } from "@/types/database";

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
        <MovementPicker initialLogs={[]} />
      </main>
    );
  }

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
  const [
    { data: items },
    { data: profile },
    { data: principles },
    { data: habits },
    { data: habitCompletions },
    { data: movementLogs },
    streakInfo,
  ] = await Promise.all([
    supabase.from("items").select("*").eq("household_id", householdId),
    supabase.from("profiles").select("display_name, timezone").eq("id", user!.id).maybeSingle(),
    supabase
      .from("principles")
      .select("*")
      .eq("household_id", householdId)
      .eq("active", true)
      .order("last_shown_at", { ascending: true, nullsFirst: true })
      .limit(1),
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
      .eq("completed_on", todayInTz((null as any))),
    supabase
      .from("movement_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("day", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10))
      .order("created_at", { ascending: false }),
    getStreak(user!.id),
  ]);

  const allItems = (items ?? []) as Item[];
  const tz = (profile as { timezone?: string } | null)?.timezone ?? null;

  const lockedIds = await getOrLockTodaysFocus({
    supabase,
    userId: user!.id,
    householdId,
    items: allItems,
    tz,
  });

  // Render only locked picks that aren't done. Completing one clears the slot.
  const lockedItems = lockedIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is Item => Boolean(i));
  const stillOpen = lockedItems.filter((i) => i.status !== "done");

  const focusItems: MockItem[] = stillOpen.map((it) => ({
    id: it.id,
    title: it.title,
    notes: it.notes ?? undefined,
    area: (it.life_area as LifeAreaKey) ?? "growth",
    effortMinutes: it.effort_minutes ?? 30,
    reason: it.priority_reason ?? "today's focus",
    isNextAction: it.is_next_action,
  }));

  const resting = allItems.filter((i) => i.status !== "done" && i.status !== "someday").length - focusItems.length;

  const principle = principles?.[0];

  if (principle) {
    void supabase
      .from("principles")
      .update({ last_shown_at: new Date().toISOString() })
      .eq("id", principle.id);
  }

  const habitsToday = (habits ?? []) as any[];
  const habitsDoneToday = (habitCompletions ?? []).length;
  const focusDoneToday = lockedItems.length - stillOpen.length;
  const counts = {
    focusTotal: lockedItems.length,
    focusDone: focusDoneToday,
    habitsTotal: habitsToday.length,
    habitsDone: habitsDoneToday,
    hasWorkout: (movementLogs ?? []).some((l: any) => l.day === todayInTz(tz)),
    workoutDone: (movementLogs ?? []).some((l: any) => l.day === todayInTz(tz)),
    hasPrinciple: Boolean(principle),
  };

  // Has the user connected Google? Decides whether to even render the calendar block.
  const admin = supabaseService();
  const { data: googleRow } = await admin
    .from("google_accounts")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();
  const calendarConnected = Boolean(googleRow);

  const firstName = (profile as { display_name?: string } | null)?.display_name?.split(" ")[0] ?? "friend";

  return (
    <main className="flex flex-col">
      <MorningBriefing
        name={firstName}
        principle={
          principle
            ? { text: principle.text, group: principle.theme ?? null }
            : null
        }
        focusItems={focusItems.map((it) => ({ id: it.id, title: it.title, area: it.area }))}
        habitsCount={habitsToday.length}
        workoutName={null}
      />
      <DailyDriveHeader
        name={firstName}
        streak={streakInfo.streak}
        streakActiveToday={streakInfo.todayActive}
        resting={Math.max(0, resting)}
        signedIn
        counts={counts}
      />
      {principle && (
        <PrincipleCard
          id={principle.id}
          text={principle.text}
          group={principle.theme ?? "principle"}
          lesson={principle.lesson ?? null}
        />
      )}
      <TodaysFocus items={focusItems} totalLocked={lockedItems.length} />
      <TodaysHabits habits={(habits ?? []) as any} completions={(habitCompletions ?? []) as any} />
      {calendarConnected ? (
        <UpcomingEvents />
      ) : (
        <section className="px-4">
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            upcoming events
          </h2>
          <GlassCard inset variant="subtle">
            <p className="text-sm text-white/65">
              Connect Google Calendar from Settings to see your real meetings here.
            </p>
            <Link
              href="/api/calendar/oauth"
              className="mt-3 inline-block rounded-pill bg-accent-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-glow"
            >
              connect calendar
            </Link>
          </GlassCard>
        </section>
      )}
      <MovementPicker initialLogs={(movementLogs ?? []) as any} />
    </main>
  );
}
