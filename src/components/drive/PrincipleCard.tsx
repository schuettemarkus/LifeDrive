"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";

export function PrincipleCard({ text, group }: { text: string; group: string }) {
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
      <GlassCard inset variant="subtle" className="relative overflow-hidden">
        <Quote className="absolute -right-1 -top-1 h-12 w-12 text-white/[0.05]" />
        <p className="text-balance text-[16px] leading-snug text-white/85">
          {text}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
          {group.replace(/_/g, " ")}
        </p>
      </GlassCard>
    </motion.section>
  );
}
