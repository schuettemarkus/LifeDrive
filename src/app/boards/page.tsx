import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { TaskList } from "@/components/boards/TaskList";
import { AreaPill } from "@/components/glass/AreaPill";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { listItems } from "@/lib/items";
import { LIFE_AREAS, LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";

export const dynamic = "force-dynamic";

export default async function BoardsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const householdId = await getCurrentHouseholdId();
  const sp = await searchParams;
  const area = sp.area && LIFE_AREA_KEYS.includes(sp.area as LifeAreaKey)
    ? (sp.area as LifeAreaKey)
    : null;

  if (!householdId) {
    return (
      <main>
        <PageHeader eyebrow="all tasks" title="Boards" />
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
  const items = await listItems(supabase, householdId, area ? { area } : undefined);

  return (
    <main>
      <PageHeader
        eyebrow="all tasks"
        title={area ? `${LIFE_AREAS[area].name} tasks` : "Boards"}
        description={area ? "Filtered by area. Tap a row to edit." : "Everything in one place. Tap to edit."}
      />

      <section className="px-4 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/boards"
            className={`rounded-pill px-2.5 py-0.5 text-[11px] ${
              !area
                ? "border border-white/15 bg-white/10 text-white"
                : "border border-white/10 bg-white/5 text-white/55"
            }`}
          >
            all
          </Link>
          {LIFE_AREA_KEYS.map((k) => {
            const active = area === k;
            return (
              <Link
                key={k}
                href={`/boards?area=${k}`}
                className="no-tap-highlight inline-flex"
                style={{ opacity: active ? 1 : 0.7 }}
              >
                <AreaPill area={k} size="xs" className={active ? "ring-1 ring-white/20" : ""} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 pt-4 pb-32">
        {items.length === 0 ? (
          <GlassCard inset variant="subtle">
            <p className="text-sm text-white/65">
              Nothing here yet. {area ? `Try a different area or capture something new.` : `Drop something on the Capture tab.`}
            </p>
          </GlassCard>
        ) : (
          <TaskList initial={items} />
        )}
      </section>
    </main>
  );
}
