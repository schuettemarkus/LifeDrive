"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { GoogleIcon } from "@/components/glass/GoogleIcon";
import { PageHeader } from "@/components/glass/PageHeader";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignInPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="welcome back" title="Sign in to Life Drive" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not send the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setBusy(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
          scopes:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        eyebrow="welcome back"
        title="Sign in to Life Drive"
        description="One link, one tap, you're in."
      />
      <section className="px-4 pt-5 pb-32 space-y-3">
        <GlassCard inset>
          {sent ? (
            <div className="text-center">
              <Mail className="mx-auto h-8 w-8 text-accent-cyan" />
              <p className="mt-3 font-medium text-white">Check your email.</p>
              <p className="text-xs text-white/55">We sent a magic link to {email}.</p>
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <label className="block text-[10px] uppercase tracking-[0.18em] text-white/40">
                email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white placeholder:text-white/35 focus:border-accent-violet focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !email}
                className="w-full rounded-pill bg-accent-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
              >
                {busy ? "sending…" : "send magic link"}
              </button>
            </form>
          )}
        </GlassCard>

        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GlassCard inset>
          <button
            onClick={withGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-pill border border-white/15 bg-white px-5 py-3 text-sm font-medium text-[#1f1f1f] shadow-sm transition-opacity disabled:opacity-60"
          >
            <GoogleIcon className="shrink-0" />
            <span>Continue with Google</span>
          </button>
          <p className="mt-2 text-center text-[11px] text-white/45">
            We'll ask for read + write access to your calendar so Life Drive can book focus blocks.
          </p>
        </GlassCard>

        {error && <p className="text-center text-xs text-red-300">{error}</p>}

        <p
          onClick={() => router.push("/onboarding")}
          className="cursor-pointer text-center text-xs text-white/45"
        >
          first time here? start with onboarding ↗
        </p>
      </section>
    </main>
  );
}
