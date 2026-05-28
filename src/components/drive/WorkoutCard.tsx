"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Check } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";

export function WorkoutCard({ name, exercises }: { name: string; exercises: string[] }) {
  const [done, setDone] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-28 px-4"
    >
      <h2 className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
        <Dumbbell className="h-3.5 w-3.5" />
        today's movement
      </h2>
      <GlassCard inset className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">workout</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{name}</h3>
            <ul className="mt-3 space-y-1 text-[13px] text-white/70">
              {exercises.map((e) => (
                <li key={e} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setDone((v) => !v)}
            aria-pressed={done}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5"
            style={
              done
                ? { background: "linear-gradient(135deg,#7C5CFF,#00D4FF)", borderColor: "transparent" }
                : undefined
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Check className="h-5 w-5 text-white" />
                </motion.span>
              ) : (
                <motion.span
                  key="todo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] uppercase tracking-wider text-white/70"
                >
                  do
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </GlassCard>
    </motion.section>
  );
}
