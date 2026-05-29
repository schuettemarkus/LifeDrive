"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const TRIGGER_DISTANCE = 76;
const MAX_PULL = 140;
const RESISTANCE = 0.5;

/**
 * iOS-style pull-to-refresh. Wrap the app shell once in the root layout.
 *
 * Implementation:
 *   - We listen at the document level (not on the wrapper) so it works no matter
 *     which scrollable region the user pulls on. The wrapper just translates
 *     and renders the spinner.
 *   - Touch starts only count when the document is scrolled to the very top —
 *     otherwise we yield to native scrolling. (Avoids stealing pulls mid-page.)
 *   - On release past TRIGGER_DISTANCE, we call router.refresh(). Spinner
 *     stays visible while the RSC re-fetch resolves.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const y = useMotionValue(0);
  const spinnerOpacity = useTransform(y, [0, TRIGGER_DISTANCE], [0, 1]);
  const spinnerRotate = useTransform(y, [0, TRIGGER_DISTANCE * 2], [0, 360]);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    function topScroll() {
      // Scroll position of whichever element actually owns scrolling.
      return Math.max(document.scrollingElement?.scrollTop ?? 0, window.scrollY);
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (e.touches.length !== 1) return;
      if (topScroll() > 0) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!activeRef.current || startYRef.current === null) return;
      if (refreshing) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        // user is scrolling up — give up the pull
        y.set(0);
        return;
      }
      const pulled = Math.min(MAX_PULL, dy * RESISTANCE);
      y.set(pulled);
      // Once we're pulling visibly, suppress the native rubber-band so the
      // spinner doesn't fight Safari's overscroll glow.
      if (pulled > 4 && e.cancelable) e.preventDefault();
    }

    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      const distance = y.get();
      startYRef.current = null;
      if (distance >= TRIGGER_DISTANCE && !refreshing) {
        setRefreshing(true);
        y.set(TRIGGER_DISTANCE);
        try {
          router.refresh();
          // Give the RSC fetch ~600ms to render, then release the spinner.
          await new Promise((r) => setTimeout(r, 650));
        } finally {
          setRefreshing(false);
          y.set(0);
        }
      } else {
        y.set(0);
      }
    }

    // passive: false so we can preventDefault to cancel rubber-band scroll
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [refreshing, router, y]);

  return (
    <>
      <motion.div
        aria-hidden
        style={{
          y: useTransform(y, (v) => v / 2),
          opacity: spinnerOpacity,
        }}
        className="pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2"
      >
        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/55 backdrop-blur-md">
          <motion.div
            style={refreshing ? { rotate: 360 } : { rotate: spinnerRotate }}
            transition={
              refreshing
                ? { repeat: Infinity, duration: 0.9, ease: "linear" }
                : { type: "tween", duration: 0 }
            }
          >
            <RefreshCw className="h-4 w-4 text-white/85" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div style={{ y }}>{children}</motion.div>
    </>
  );
}
