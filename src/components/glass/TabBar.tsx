"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket, Plus, ListChecks, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/design";

type Tab = { href: string; label: string; icon: typeof Rocket; primary?: boolean };

const TABS: Tab[] = [
  { href: "/", label: "Drive", icon: Rocket },
  { href: "/boards", label: "Boards", icon: ListChecks },
  { href: "/capture", label: "Capture", icon: Plus, primary: true },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/review", label: "Review", icon: Sparkles },
];

export function TabBar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/auth")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-xl items-end justify-center px-4 safe-bottom"
    >
      <div className="glass-surface-strong relative flex w-full items-center justify-around rounded-glass px-2 py-2">
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname?.startsWith(t.href));
          const Icon = t.icon;
          if (t.primary) {
            return (
              <Link
                key={t.href}
                href={t.href}
                prefetch
                className="no-tap-highlight relative -mt-7 grid h-14 w-14 place-items-center rounded-full bg-accent-gradient shadow-glow"
                aria-label={t.label}
              >
                <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
              </Link>
            );
          }
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              aria-label={t.label}
              className="no-tap-highlight relative flex flex-1 flex-col items-center justify-center py-2.5"
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-6 w-6 transition-colors", active ? "text-white" : "text-white/55")} />
              {active && (
                <motion.div
                  layoutId="tab-active-dot"
                  transition={SPRING}
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-cyan"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
