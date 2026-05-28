"use client";

import { motion } from "framer-motion";
import { LIFE_AREAS, LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/design";

type Distribution = Partial<Record<LifeAreaKey, number>>;

/**
 * Each spoke length = actual share / target share, clamped 0–1.4.
 * Dim if under-invested.
 */
export function BalanceWheel({
  actualPct,
  size = 260,
  className,
}: {
  actualPct: Distribution;
  size?: number;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = (size / 2) * 0.86;
  const n = LIFE_AREA_KEYS.length;

  const spokes = LIFE_AREA_KEYS.map((k, i) => {
    const actual = actualPct[k] ?? 0;
    const target = LIFE_AREAS[k].targetWeeklyPct;
    const ratio = Math.min(1.4, actual / target);
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = rMax * (0.18 + 0.82 * ratio);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const labelX = cx + Math.cos(angle) * (rMax + 14);
    const labelY = cy + Math.sin(angle) * (rMax + 14);
    return { key: k, angle, x, y, ratio, color: LIFE_AREAS[k].color, labelX, labelY };
  });

  // build polygon point list
  const points = spokes.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <svg width={size} height={size} className={className}>
      <defs>
        <radialGradient id="wheelFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      {/* concentric guides */}
      {[0.33, 0.66, 1].map((t) => (
        <circle
          key={t}
          cx={cx}
          cy={cy}
          r={rMax * t}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
        />
      ))}
      {/* polygon */}
      <motion.polygon
        points={points}
        fill="url(#wheelFill)"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* spokes + dots */}
      {spokes.map((s) => (
        <g key={s.key}>
          <line
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(s.angle) * rMax}
            y2={cy + Math.sin(s.angle) * rMax}
            stroke="rgba(255,255,255,0.05)"
          />
          <circle cx={s.x} cy={s.y} r={4} fill={s.color} opacity={0.4 + 0.6 * Math.min(1, s.ratio)} />
          <text
            x={s.labelX}
            y={s.labelY}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.7)"
            style={{ fontFamily: "inherit" }}
          >
            {LIFE_AREAS[s.key].name.toLowerCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
