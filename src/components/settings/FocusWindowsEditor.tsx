"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import type { FocusWindow, WorkingHours } from "@/types/database";

export function FocusWindowsEditor({
  initialFocusWindows,
  initialWorkingHours,
}: {
  initialFocusWindows: FocusWindow[];
  initialWorkingHours: WorkingHours;
}) {
  const router = useRouter();
  const [windows, setWindows] = useState<FocusWindow[]>(
    initialFocusWindows.length > 0 ? initialFocusWindows : [{ start: "06:00", end: "07:00" }],
  );
  const [working, setWorking] = useState<WorkingHours>(initialWorkingHours);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(idx: number, key: "start" | "end" | "label", value: string) {
    setWindows((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, [key]: value } : w)),
    );
  }

  function add() {
    setWindows((prev) => [...prev, { start: "13:00", end: "14:00" }]);
  }

  function remove(idx: number) {
    setWindows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ focus_windows: windows, working_hours: working }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard inset>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        working hours
      </p>
      <p className="text-[11px] text-white/55">
        The window the auto-planner is allowed to write into.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          value={working.start}
          onChange={(e) => setWorking((w) => ({ ...w, start: e.target.value }))}
          className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-sm tabular-nums text-white"
        />
        <span className="text-white/40">→</span>
        <input
          type="time"
          value={working.end}
          onChange={(e) => setWorking((w) => ({ ...w, end: e.target.value }))}
          className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-sm tabular-nums text-white"
        />
      </div>

      <hr className="my-4 border-white/5" />

      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        focus windows
      </p>
      <p className="text-[11px] text-white/55">
        Deep-work blocks. Today's top 3 focus tasks get auto-scheduled into these.
      </p>

      <div className="mt-2 space-y-2">
        <AnimatePresence initial={false}>
          {windows.map((w, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <input
                type="time"
                value={w.start}
                onChange={(e) => update(i, "start", e.target.value)}
                className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-sm tabular-nums text-white"
              />
              <span className="text-white/40">→</span>
              <input
                type="time"
                value={w.end}
                onChange={(e) => update(i, "end", e.target.value)}
                className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-sm tabular-nums text-white"
              />
              <input
                type="text"
                value={w.label ?? ""}
                onChange={(e) => update(i, "label", e.target.value)}
                placeholder="label (optional)"
                className="min-w-0 flex-1 rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white placeholder:text-white/35"
              />
              <button
                onClick={() => remove(i)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-red-400/30 bg-red-500/10 text-red-200"
                aria-label="remove window"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={add}
        className="mt-3 flex items-center gap-1 rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/75"
      >
        <Plus className="h-3 w-3" /> add window
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        {err && <p className="text-[11px] text-red-300">{err}</p>}
        {saved && !err && (
          <p className="text-[11px] text-emerald-300">saved</p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto flex items-center gap-1 rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "saving…" : "save"}
        </button>
      </div>
    </GlassCard>
  );
}
