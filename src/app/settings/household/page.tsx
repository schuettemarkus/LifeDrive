import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/household";
import { InviteForm } from "@/components/settings/InviteForm";

export const dynamic = "force-dynamic";

export default async function HouseholdPage() {
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return (
      <main>
        <PageHeader title="Household" />
        <section className="px-4 pt-5 pb-32">
          <GlassCard inset>
            <p className="text-sm text-white/75">No household yet.</p>
            <Link href="/onboarding/household" className="mt-3 inline-block rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow">
              create
            </Link>
          </GlassCard>
        </section>
      </main>
    );
  }

  const supabase = await supabaseServer();
  const { data: hh } = await supabase.from("households").select("*").eq("id", householdId).maybeSingle();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at, profiles!inner(display_name, avatar_url)")
    .eq("household_id", householdId);
  const { data: invites } = await supabase
    .from("invites")
    .select("*")
    .eq("household_id", householdId)
    .is("accepted_by", null)
    .order("created_at", { ascending: false });

  return (
    <main>
      <PageHeader eyebrow="household" title={(hh as any)?.name ?? "Home base"} description="Members + invites." />
      <section className="px-4 pt-5 pb-32 space-y-3">
        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">members</p>
          <ul className="mt-2 space-y-2">
            {(members ?? []).map((m: any) => (
              <li key={m.user_id} className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-medium text-white/80">
                  {(m.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{m.profiles?.display_name ?? "unnamed"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">{m.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">invite</p>
          <InviteForm />
        </GlassCard>

        {(invites?.length ?? 0) > 0 && (
          <GlassCard inset>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">pending invites</p>
            <ul className="mt-2 space-y-1.5 text-sm text-white/80">
              {(invites ?? []).map((i: any) => (
                <li key={i.id} className="flex items-center justify-between">
                  <span>{i.email}</span>
                  <span className="text-[10px] text-white/40">
                    expires {new Date(i.expires_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </section>
    </main>
  );
}
