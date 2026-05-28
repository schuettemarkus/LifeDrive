"use client";

import { useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SwipeRowProps = {
  children: ReactNode;
  onComplete?: () => void;
  onSnooze?: () => void;
  className?: string;
};

const THRESHOLD = 88;

export function SwipeRow({ children, onComplete, onSnooze, className }: SwipeRowProps) {
  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [0, THRESHOLD], [0, 1]);
  const snoozeOpacity = useTransform(x, [-THRESHOLD, 0], [1, 0]);
  const [done, setDone] = useState<"complete" | "snooze" | null>(null);

  function handleEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > THRESHOLD) {
      setDone("complete");
      onComplete?.();
    } else if (info.offset.x < -THRESHOLD) {
      setDone("snooze");
      onSnooze?.();
    }
  }

  if (done) {
    return (
      <motion.div
        layout
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Complete (swipe right) backdrop */}
      <motion.div
        style={{ opacity: completeOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-start rounded-glass bg-emerald-500/20 pl-5"
      >
        <Check className="h-5 w-5 text-emerald-300" />
        <span className="ml-2 text-sm text-emerald-200">complete</span>
      </motion.div>
      {/* Snooze (swipe left) backdrop */}
      <motion.div
        style={{ opacity: snoozeOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-glass bg-amber-500/15 pr-5"
      >
        <span className="mr-2 text-sm text-amber-200">snooze</span>
        <Clock className="h-5 w-5 text-amber-300" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        style={{ x }}
        onDragEnd={handleEnd}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
