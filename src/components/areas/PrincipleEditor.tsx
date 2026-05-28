"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import type { Principle } from "@/types/database";

export function PrincipleEditor({ initial }: { initial: Principle[] }) {
  const [items, setItems] = useState<Principle[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/principles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (res.ok && j.principle) setItems((p) => [j.principle, ...p]);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setItems((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/principles/${id}`, { method: "DELETE" });
  }

  async function toggle(p: Principle) {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    await fetch(`/api/principles/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
  }

  return (
    <section className="px-4 pt-5 pb-32 space-y-3">
      <GlassCard inset>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a principle"
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent-violet focus:outline-none"
          />
          <button
            onClick={add}
            disabled={busy || !text.trim()}
            className="grid h-10 w-10 place-items-center rounded-full bg-accent-gradient shadow-glow disabled:opacity-60"
            aria-label="Add"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </GlassCard>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: p.active ? 1 : 0.45, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard inset className="flex items-start gap-3">
                <button
                  onClick={() => toggle(p)}
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${p.active ? "border-emerald-400 bg-emerald-400" : "border-white/30 bg-transparent"}`}
                  aria-label={p.active ? "Deactivate" : "Activate"}
                />
                <div className="flex-1">
                  <p className="text-[14px] leading-snug text-white/90">{p.text}</p>
                  {p.theme && (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{p.theme.replace(/_/g, " ")}</p>
                  )}
                </div>
                <button onClick={() => remove(p.id)} className="text-white/35 hover:text-red-300" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
