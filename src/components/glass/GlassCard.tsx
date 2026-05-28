"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/design";

type GlassCardProps = HTMLMotionProps<"div"> & {
  variant?: "default" | "strong" | "subtle";
  glow?: boolean;
  inset?: boolean;
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className, variant = "default", glow, inset, children, ...rest },
  ref,
) {
  const base =
    variant === "strong"
      ? "glass-surface-strong"
      : variant === "subtle"
        ? "bg-white/[0.03] border border-white/5"
        : "glass-surface";

  return (
    <motion.div
      ref={ref}
      layout
      transition={SPRING}
      className={cn(
        "relative rounded-glass",
        base,
        glow && "shadow-glow",
        inset && "p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
