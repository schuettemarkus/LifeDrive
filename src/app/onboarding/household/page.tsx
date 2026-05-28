"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { PageHeader } from "@/components/glass/PageHeader";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("Home base");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      router.push("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        eyebrow="household"
        title="Name your home base"
        description="Family members you invite will see and share everything tagged 'household'."
      />
      <section className="px-4 pt-5 pb-32">
        <GlassCard inset>
          <form onSubmit={create} className="space-y-3">
            <label className="block text-[10px] uppercase tracking-[0.18em] text-white/40">name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white focus:border-accent-violet focus:outline-none"
              required
            />
            <button
              disabled={busy}
              className="w-full rounded-pill bg-accent-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
            >
              {busy ? "creating…" : "create household"}
            </button>
            {err && <p className="text-xs text-red-300">{err}</p>}
          </form>
        </GlassCard>
      </section>
    </main>
  );
}
