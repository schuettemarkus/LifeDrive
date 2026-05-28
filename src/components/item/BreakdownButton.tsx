"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMinutes } from "@/lib/utils";

type Step = { title: string; effort_minutes: number };

export function BreakdownButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ steps: Step[]; next_action_index: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setPreview({ steps: j.steps, next_action_index: j.next_action_index });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: itemId, commit: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      router.refresh();
      setPreview(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <AnimatePresence initial={false} mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <ul className="space-y-1.5">
              {preview.steps.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-[13.5px] ${
                    i === preview.next_action_index
                      ? "border-accent-violet/40 bg-accent-violet/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] text-white/70">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-white/90">{s.title}</span>
                  <span className="text-[10px] text-white/45">{formatMinutes(s.effort_minutes)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPreview(null)}
                className="rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                discard
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-pill bg-accent-gradient px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
              >
                <Check className="mr-1 inline h-4 w-4" />
                {busy ? "saving…" : "save steps"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={generate}
            disabled={busy}
            className="flex items-center gap-2 rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {busy ? "thinking…" : "ai breakdown"}
          </motion.button>
        )}
      </AnimatePresence>
      {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
    </div>
  );
}
