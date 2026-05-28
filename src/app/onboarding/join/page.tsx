"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function JoinPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const token = search.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("Missing invite token.");
      return;
    }
    setStatus("joining");
    fetch("/api/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Failed");
        setStatus("joined");
        setTimeout(() => router.push("/"), 900);
      })
      .catch((e) => {
        setStatus("error");
        setMsg(e.message ?? "Could not join.");
      });
  }, [token, router]);

  return (
    <main>
      <PageHeader eyebrow="join household" title="Just a moment" />
      <section className="px-4 pt-5">
        <GlassCard inset>
          {status === "joining" && <p className="text-white/80">Joining your household…</p>}
          {status === "joined" && <p className="text-emerald-300">You're in.</p>}
          {status === "error" && <p className="text-red-300">{msg}</p>}
        </GlassCard>
      </section>
    </main>
  );
}
