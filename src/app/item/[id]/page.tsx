import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { BreakdownButton } from "@/components/item/BreakdownButton";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { formatMinutes } from "@/lib/utils";
import type { Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return (
      <main>
        <PageHeader eyebrow="item" title="Sign in" />
        <section className="px-4 pt-5 pb-32">
          <GlassCard inset>
            <p className="text-sm text-white/75">Connect a household to view items.</p>
            <Link href="/auth/sign-in" className="mt-3 inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow">
              sign in
            </Link>
          </GlassCard>
        </section>
      </main>
    );
  }

  const supabase = await supabaseServer();
  const { data: item } = await supabase.from("items").select("*").eq("id", id).maybeSingle<Item>();
  if (!item) {
    return (
      <main>
        <PageHeader eyebrow="item" title="Not found" description="That item doesn't exist or isn't in your household." />
      </main>
    );
  }
  const { data: children } = await supabase
    .from("items")
    .select("*")
    .eq("parent_id", id)
    .order("position", { ascending: true });

  const typed = item as Item;
  const subtasks = (children ?? []) as Item[];

  return (
    <main>
      <PageHeader eyebrow={typed.type} title={typed.title} description={typed.notes ?? undefined} />
      <section className="px-4 pt-5 space-y-3 pb-32">
        <GlassCard inset className="flex items-center justify-between">
          <AreaPill area={typed.life_area} />
          <span className="text-xs text-white/55">{formatMinutes(typed.effort_minutes)}</span>
        </GlassCard>
        {typed.priority_reason && (
          <GlassCard inset variant="subtle">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">ranked because</p>
            <p className="mt-1 text-sm text-white/80">{typed.priority_reason}</p>
          </GlassCard>
        )}
        {typed.type === "project" && (
          <GlassCard inset>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">subtasks</p>
            </div>
            {subtasks.length === 0 ? (
              <BreakdownButton itemId={typed.id} />
            ) : (
              <ul className="space-y-2">
                {subtasks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[14px] text-white/85">
                    <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${c.is_next_action ? "bg-accent-cyan" : "bg-white/30"}`} />
                    <span className="flex-1">{c.title}</span>
                    <span className="text-[11px] text-white/45">{formatMinutes(c.effort_minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        )}
      </section>
    </main>
  );
}
