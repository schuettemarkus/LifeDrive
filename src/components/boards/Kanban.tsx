"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Item, ItemStatus } from "@/types/database";
import { SPRING } from "@/lib/design";
import { formatMinutes } from "@/lib/utils";

const LANES: { key: ItemStatus; label: string }[] = [
  { key: "backlog", label: "backlog" },
  { key: "this_week", label: "this week" },
  { key: "doing", label: "doing" },
  { key: "done", label: "done" },
];

export function Kanban({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Realtime subscription so two devices stay in sync.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("items-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Item;
              if (prev.find((p) => p.id === next.id)) return prev;
              return [...prev, next];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Item;
              return prev.map((p) => (p.id === next.id ? next : p));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Item;
              return prev.filter((p) => p.id !== oldRow.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const lanes = useMemo(() => {
    const grouped: Record<string, Item[]> = {};
    for (const l of LANES) grouped[l.key] = [];
    for (const it of items) {
      if (it.status in grouped) grouped[it.status].push(it);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => a.position - b.position || b.priority_score - a.priority_score);
    }
    return grouped;
  }, [items]);

  function onStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const itemId = String(e.active.id);
    const dest = String(e.over.id) as ItemStatus;
    const moving = items.find((i) => i.id === itemId);
    if (!moving || moving.status === dest) return;

    setItems((prev) => prev.map((p) => (p.id === itemId ? { ...p, status: dest } : p)));

    const patch: { status: ItemStatus; completed_at?: string | null } = { status: dest };
    if (dest === "done") patch.completed_at = new Date().toISOString();
    else patch.completed_at = null;

    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  const active = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onStart} onDragEnd={onEnd}>
      <div className="flex min-w-max gap-3">
        {LANES.map((lane) => (
          <Lane key={lane.key} laneKey={lane.key} label={lane.label} count={lanes[lane.key].length}>
            <AnimatePresence initial={false}>
              {lanes[lane.key].map((it) => (
                <DraggableCard key={it.id} item={it} />
              ))}
            </AnimatePresence>
            {lanes[lane.key].length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-white/35">
                drop something here
              </p>
            )}
          </Lane>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? <CardSurface item={active} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Lane({ laneKey, label, count, children }: { laneKey: ItemStatus; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: laneKey });
  return (
    <div ref={setNodeRef} className="w-64 shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{label}</h2>
        <span className="text-[10px] text-white/35">{count}</span>
      </div>
      <motion.div
        animate={{
          backgroundColor: isOver ? "rgba(124,92,255,0.06)" : "rgba(255,255,255,0)",
          boxShadow: isOver ? "inset 0 0 0 1px rgba(124,92,255,0.5)" : "inset 0 0 0 1px rgba(255,255,255,0)",
        }}
        transition={{ duration: 0.18 }}
        className="space-y-2 rounded-glass p-1"
      >
        {children}
      </motion.div>
    </div>
  );
}

function DraggableCard({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: item.id });
  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0 : 1,
      }}
      transition={SPRING}
      {...attributes}
      {...listeners}
    >
      <CardSurface item={item} />
    </motion.div>
  );
}

function CardSurface({ item, dragging }: { item: Item; dragging?: boolean }) {
  return (
    <GlassCard
      variant={dragging ? "strong" : "default"}
      className={`px-3 py-2.5 ${dragging ? "rotate-[1deg] shadow-glass-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <AreaPill area={item.life_area} size="xs" />
        <span className="text-[10px] tabular-nums text-white/40">{formatMinutes(item.effort_minutes)}</span>
      </div>
      <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/90">{item.title}</p>
      {item.is_next_action && (
        <span className="mt-2 inline-block rounded-pill border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
          next action
        </span>
      )}
    </GlassCard>
  );
}
