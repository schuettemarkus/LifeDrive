"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { SPRING_SOFT } from "@/lib/design";

export function PrincipleCard({
  id,
  text,
  group,
  lesson: initialLesson,
}: {
  id?: string;
  text: string;
  group: string;
  lesson?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [lesson, setLesson] = useState<string | null>(initialLesson ?? null);
  const [loading, setLoading] = useState(false);
  const interactive = Boolean(id);

  async function ensureLesson() {
    if (!id) return;
    if (lesson) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/principles/${id}/lesson`);
      const j = await res.json();
      if (res.ok) setLesson(j.lesson);
    } catch {
      /* silently — the principle itself is still visible */
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!interactive) return;
    if (!open) void ensureLesson();
    setOpen((v) => !v);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="px-4"
    >
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        today's principle
      </h2>
      <motion.div layout transition={SPRING_SOFT}>
        <GlassCard
          inset
          variant="subtle"
          className="relative overflow-hidden"
          onClick={interactive ? toggle : undefined}
          role={interactive ? "button" : undefined}
          aria-expanded={interactive ? open : undefined}
          style={interactive ? { cursor: "pointer" } : undefined}
        >
          <Quote className="absolute -right-1 -top-1 h-12 w-12 text-white/[0.05]" />
          <p className="text-balance text-[16px] leading-snug text-white/90">{text}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {group.replace(/_/g, " ")}
            </p>
            {interactive && (
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/5"
              >
                <ChevronDown className="h-3.5 w-3.5 text-white/65" />
              </motion.span>
            )}
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mt-4 border-t border-white/5 pt-4">
                  {loading && !lesson && (
                    <p className="animate-pulse text-[13px] leading-relaxed text-white/55">
                      summarizing the principle…
                    </p>
                  )}
                  {lesson && (
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-white/80">
                      {lesson}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </motion.section>
  );
}
