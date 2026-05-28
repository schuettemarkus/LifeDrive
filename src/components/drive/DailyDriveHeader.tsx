"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { shortDate, timeOfDay } from "@/lib/utils";

export function DailyDriveHeader({
  streak,
  name,
  resting,
}: {
  streak: number;
  name: string;
  resting: number;
}) {
  return (
    <header className="px-4 pt-6">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-sm text-white/55"
      >
        {timeOfDay()}, {name}.
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-balance"
      >
        {shortDate(new Date())}
      </motion.h1>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-pill border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-amber-200">
          <Flame className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{streak}-day streak</span>
        </div>
        <span className="text-xs text-white/40">{resting} resting</span>
      </div>
    </header>
  );
}
