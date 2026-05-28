import Link from "next/link";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let connected = false;
  let profile: any = null;
  let household: any = null;
  if (user) {
    const admin = supabaseService();
    const { data: g } = await admin
      .from("google_accounts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    connected = Boolean(g);
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = p;
    if (p?.household_id) {
      const { data: h } = await supabase.from("households").select("*").eq("id", p.household_id).maybeSingle();
      household = h;
    }
  }

  return (
    <main>
      <PageHeader title="Settings" />
      <section className="px-4 pt-5 pb-32 space-y-3">
        {sp.google === "connected" && (
          <GlassCard inset variant="subtle">
            <p className="text-sm text-emerald-300">Google Calendar connected.</p>
          </GlassCard>
        )}
        {sp.google && sp.google !== "connected" && (
          <GlassCard inset variant="subtle">
            <p className="text-sm text-red-300">Google connect failed: {sp.google}</p>
          </GlassCard>
        )}

        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">profile</p>
          <p className="mt-1 text-base font-medium text-white">{profile?.display_name ?? "—"}</p>
          <p className="text-xs text-white/55">
            {profile?.timezone ?? "—"} · {profile?.working_hours?.start ?? "06:00"}–{profile?.working_hours?.end ?? "21:00"}
          </p>
        </GlassCard>

        <GlassCard inset>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">integrations</p>
              <p className="mt-1 font-medium text-white">Google Calendar</p>
              <p className="text-xs text-white/55">{connected ? "connected" : "not connected"}</p>
            </div>
            <Link
              href="/api/calendar/oauth"
              className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              {connected ? "reconnect" : "connect"}
            </Link>
          </div>
        </GlassCard>

        <GlassCard inset>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">household</p>
          <p className="mt-1 font-medium text-white">{household?.name ?? "—"}</p>
          {household && (
            <Link
              href="/settings/household"
              className="mt-2 inline-block text-xs text-accent-cyan"
            >
              manage members ↗
            </Link>
          )}
        </GlassCard>

        <form action="/auth/sign-out" method="post">
          <button className="mt-4 w-full rounded-pill border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/75">
            sign out
          </button>
        </form>
      </section>
    </main>
  );
}
