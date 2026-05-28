import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { Kanban } from "@/components/boards/Kanban";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { listItems } from "@/lib/items";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    return (
      <main>
        <PageHeader eyebrow="kanban" title="Boards" />
        <section className="px-4 pt-5 pb-32">
          <GlassCard inset>
            <p className="text-sm text-white/75">
              Finish onboarding to start adding projects and tasks.
            </p>
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
  const items = await listItems(supabase, householdId);

  return (
    <main>
      <PageHeader eyebrow="kanban" title="Boards" description="Drag across the week." />
      <section className="overflow-x-auto px-4 pt-5 pb-32">
        <Kanban initial={items} />
      </section>
    </main>
  );
}
