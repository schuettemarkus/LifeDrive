import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { HabitList } from "@/components/habits/HabitList";
import type { Habit, HabitCompletion } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return (
      <main>
        <PageHeader eyebrow="rituals" title="Daily habits" />
        <section className="px-4 pt-5 pb-tabbar">
          <GlassCard inset>
            <p className="text-sm text-white/75">Finish onboarding to add habits.</p>
            <Link
              href="/onboarding/household"
              className="mt-3 inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              create household
            </Link>
          </GlassCard>
        </section>
      </main>
    );
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const sevenAgo = new Date();
  sevenAgo.setDate(sevenAgo.getDate() - 6);
  const sevenAgoIso = sevenAgo.toISOString().slice(0, 10);

  const [{ data: habits }, { data: completions }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user!.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user!.id)
      .gte("completed_on", sevenAgoIso),
  ]);

  return (
    <main>
      <PageHeader
        eyebrow="rituals"
        title="Daily habits"
        description="Small, repeating moves. Pick when each shows up on the Drive."
      />
      <HabitList
        initialHabits={(habits ?? []) as Habit[]}
        initialCompletions={(completions ?? []) as HabitCompletion[]}
      />
    </main>
  );
}
