"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function StageNextWeekButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/review/stage-next-week", { method: "POST" });
      const j = await res.json();
      if (res.ok) {
        setCount(j.staged ?? 0);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="flex items-center gap-2 rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4" />
      {busy ? "staging…" : count !== null ? `staged ${count}` : "stage"}
    </button>
  );
}
