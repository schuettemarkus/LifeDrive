"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

const VAPID_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "checking" | "unsupported" | "denied" | "off" | "on" | "busy";

export function PushToggle() {
  const [state, setState] = useState<State>("checking");
  const [msg, setMsg] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const existing = await reg?.pushManager.getSubscription();
      if (!cancelled) setState(existing ? "on" : "off");
    }
    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setMsg(null);
    if (!VAPID_KEY) {
      setMsg("Push not configured on the server yet (missing VAPID public key).");
      return;
    }
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          user_agent: navigator.userAgent.slice(0, 200),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Subscription save failed");
      }
      setState("on");
    } catch (e: any) {
      setMsg(e.message ?? "Could not enable notifications.");
      setState("off");
    }
  }

  async function disable() {
    setMsg(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e: any) {
      setMsg(e.message ?? "Could not disable.");
      setState("on");
    }
  }

  async function test() {
    setMsg(null);
    setTestSent(false);
    const res = await fetch("/api/push/test", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(j.error ?? "Could not send test.");
      return;
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2000);
  }

  return (
    <div className="mt-2 space-y-2">
      {state === "unsupported" && (
        <p className="text-xs text-white/55">
          Push isn't supported on this browser. iOS Safari supports it only when the app is installed to the home screen.
        </p>
      )}
      {state === "denied" && (
        <p className="text-xs text-amber-200">
          You blocked notifications in your browser. Allow them in site settings and refresh to re-enable.
        </p>
      )}
      {state === "checking" && <p className="text-xs text-white/45">Checking notification status…</p>}
      {state === "off" && (
        <button
          onClick={enable}
          className="flex items-center gap-2 rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          <Bell className="h-4 w-4" />
          enable notifications
        </button>
      )}
      {state === "busy" && (
        <button disabled className="flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
          working…
        </button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-pill border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5" /> notifications on
          </span>
          <button
            onClick={test}
            className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80"
          >
            {testSent ? "✓ sent" : "send a test"}
          </button>
          <button
            onClick={disable}
            className="flex items-center gap-1 rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65"
          >
            <BellOff className="h-3 w-3" />
            disable
          </button>
        </div>
      )}
      {msg && <p className="text-[11px] text-red-300">{msg}</p>}
    </div>
  );
}
