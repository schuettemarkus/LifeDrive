"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Lightweight, no-deps confetti micro-moment. Respects prefers-reduced-motion
 * (renders nothing in that case — the swipe animation alone communicates the action).
 */
const COLORS = ["#7C5CFF", "#00D4FF", "#FF8A5B", "#FFC542", "#2DD4A7", "#F472B6"];

export function Celebration({
  trigger,
  durationMs = 1100,
  particles = 14,
}: {
  trigger: number; // increment this number to fire
  durationMs?: number;
  particles?: number;
}) {
  const [bursts, setBursts] = useState<{ id: number; pieces: { dx: number; dy: number; rotate: number; color: string }[] }[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!trigger || reducedMotion) return;
    const id = Date.now();
    const pieces = Array.from({ length: particles }, () => ({
      dx: (Math.random() - 0.5) * 320,
      dy: -200 - Math.random() * 200,
      rotate: (Math.random() - 0.5) * 720,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    setBursts((b) => [...b, { id, pieces }]);
    const t = window.setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [trigger, durationMs, particles, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <AnimatePresence>
        {bursts.map((b) => (
          <div key={b.id} className="relative h-0 w-0">
            {b.pieces.map((p, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: p.dx, y: p.dy + 320, rotate: p.rotate, opacity: 0 }}
                transition={{ duration: durationMs / 1000, ease: [0.18, 0.7, 0.4, 1] }}
                style={{
                  background: p.color,
                  borderRadius: 2,
                  width: 8,
                  height: 12,
                  position: "absolute",
                }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
