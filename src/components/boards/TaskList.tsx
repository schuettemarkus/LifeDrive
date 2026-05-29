"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Check,
  Trash2,
  Save,
  CalendarClock,
  Inbox,
  Sparkles,
  Layers,
  CheckCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { formatMinutes } from "@/lib/utils";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";
import type { Item, ItemStatus } from "@/types/database";

const GROUPS: { value: ItemStatus; label: string; icon: typeof Inbox }[] = [
  { value: "doing", label: "doing", icon: Sparkles },
  { value: "this_week", label: "this week", icon: CalendarClock },
  { value: "inbox", label: "inbox", icon: Inbox },
  { value: "backlog", label: "backlog", icon: Layers },
  { value: "someday", label: "someday", icon: Layers },
  { value: "done", label: "done", icon: CheckCheck },
];

export function TaskList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const grouped = useMemo(() => {
    const filtered =
      filter === "open" ? items.filter((i) => i.status !== "done" && i.status !== "someday") : items;
    const map = new Map<ItemStatus, Item[]>();
    for (const g of GROUPS) map.set(g.value, []);
    for (const it of filtered) {
      const arr = map.get(it.status) ?? [];
      arr.push(it);
      map.set(it.status, arr);
    }
    return map;
  }, [items, filter]);

  function applyPatch(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function save(id: string, patch: Partial<Item>) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { item } = await res.json();
      if (item) applyPatch(id, item);
      router.refresh();
    }
  }

  async function complete(id: string) {
    await fetch(`/api/items/${id}/complete`, { method: "POST" });
    applyPatch(id, { status: "done" });
    router.refresh();
  }

  async function remove(id: string) {
    const ok = typeof window !== "undefined" && window.confirm("Delete this task? Can't undo.");
    if (!ok) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (openId === id) setOpenId(null);
    router.refresh();
  }

  const totalOpen = items.filter((i) => i.status !== "done" && i.status !== "someday").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-white/55">
          {totalOpen} open · {items.length - totalOpen} resting
        </p>
        <div className="flex gap-1 rounded-pill border border-white/10 bg-white/[0.04] p-0.5 text-[11px]">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-pill px-2.5 py-1 uppercase tracking-wider ${
                filter === f ? "bg-white/10 text-white" : "text-white/55"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {GROUPS.map((g) => {
        const list = grouped.get(g.value) ?? [];
        if (list.length === 0) return null;
        const Icon = g.icon;
        return (
          <div key={g.value} className="space-y-2">
            <h3 className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              <Icon className="h-3 w-3" />
              {g.label}
              <span className="text-white/30">· {list.length}</span>
            </h3>
            {list.map((it) => (
              <Row
                key={it.id}
                item={it}
                open={openId === it.id}
                onToggle={() => setOpenId(openId === it.id ? null : it.id)}
                onComplete={() => complete(it.id)}
                onSave={(patch) => save(it.id, patch)}
                onDelete={() => remove(it.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Row({
  item,
  open,
  onToggle,
  onComplete,
  onSave,
  onDelete,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onSave: (patch: Partial<Item>) => Promise<void> | void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [area, setArea] = useState<string | null>(item.life_area);
  const [effort, setEffort] = useState<number | "">(item.effort_minutes ?? "");
  const [impact, setImpact] = useState(item.impact);
  const [urgency, setUrgency] = useState(item.urgency);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    title !== item.title ||
    notes !== (item.notes ?? "") ||
    area !== item.life_area ||
    (effort === "" ? null : Number(effort)) !== item.effort_minutes ||
    impact !== item.impact ||
    urgency !== item.urgency ||
    status !== item.status ||
    (dueDate || null) !== item.due_date;

  async function save() {
    setSaving(true);
    await onSave({
      title,
      notes: notes || null,
      life_area: area,
      effort_minutes: effort === "" ? null : Number(effort),
      impact,
      urgency,
      status,
      due_date: dueDate || null,
    });
    setSaving(false);
  }

  const done = item.status === "done";

  return (
    <motion.div layout transition={{ duration: 0.25 }}>
      <GlassCard inset className={done ? "opacity-65" : ""}>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            disabled={done}
            aria-label="complete"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
              done
                ? "border-emerald-400/60 bg-emerald-400/20"
                : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            {done && <Check className="h-3.5 w-3.5 text-emerald-300" />}
          </button>

          <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[14.5px] font-medium ${
                  done ? "text-white/55 line-through" : "text-white/95"
                }`}
              >
                {item.title}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
                <AreaPill area={item.life_area} size="xs" />
                <span>{formatMinutes(item.effort_minutes ?? 30)}</span>
                {item.due_date && <span>· due {item.due_date}</span>}
              </div>
            </div>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/5"
            >
              <ChevronDown className="h-3.5 w-3.5 text-white/65" />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">title</p>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full bg-transparent text-[15px] font-medium text-white placeholder:text-white/35 focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="optional context"
                    className="mt-1 w-full resize-none bg-transparent text-[13.5px] text-white/85 placeholder:text-white/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">status</p>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ItemStatus)}
                      className="mt-1 w-full rounded-pill border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white"
                    >
                      {GROUPS.map((g) => (
                        <option key={g.value} value={g.value} className="bg-black">
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">area</p>
                    <select
                      value={area ?? ""}
                      onChange={(e) => setArea(e.target.value || null)}
                      className="mt-1 w-full rounded-pill border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white"
                    >
                      <option value="" className="bg-black">none</option>
                      {LIFE_AREA_KEYS.map((k) => (
                        <option key={k} value={k} className="bg-black">
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">effort (min)</p>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={effort}
                      onChange={(e) => setEffort(e.target.value ? Number(e.target.value) : "")}
                      className="mt-1 w-full rounded-pill border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">due</p>
                    <input
                      type="date"
                      value={dueDate ?? ""}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 w-full rounded-pill border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">impact</p>
                    <StarRow value={impact} onChange={setImpact} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">urgency</p>
                    <StarRow value={urgency} onChange={setUrgency} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1 rounded-pill border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    delete
                  </button>
                  <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="flex items-center gap-1 rounded-pill bg-accent-gradient px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow disabled:opacity-40"
                  >
                    <Save className="h-3 w-3" />
                    {saving ? "saving…" : "save"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-1 flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-7 w-7 rounded-full border text-[11px] font-semibold ${
            n <= value
              ? "border-accent-violet/50 bg-accent-violet/20 text-white"
              : "border-white/10 bg-white/5 text-white/50"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
