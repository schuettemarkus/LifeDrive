import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { PrincipleEditor } from "@/components/areas/PrincipleEditor";
import type { Principle } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PrinciplesPage() {
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return (
      <main>
        <PageHeader title="Principles" />
        <section className="px-4 pt-5 pb-32">
          <GlassCard inset>
            <p className="text-sm text-white/75">Sign in to manage your principles deck.</p>
          </GlassCard>
        </section>
      </main>
    );
  }
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("principles")
    .select("*")
    .eq("household_id", householdId)
    .order("theme", { ascending: true })
    .order("text", { ascending: true });

  return (
    <main>
      <PageHeader
        eyebrow="deck"
        title="Principles"
        description="One surfaces on the Drive each day. Rotated automatically; recently-shown ones rest."
      />
      <PrincipleEditor initial={(data ?? []) as Principle[]} />
    </main>
  );
}
