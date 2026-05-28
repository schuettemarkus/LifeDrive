"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setLink(j.link);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mt-2 space-y-2">
      <form onSubmit={send} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@example.com"
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent-violet focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !email}
          className="rounded-pill bg-accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          {busy ? "creating…" : "invite"}
        </button>
      </form>
      {link && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/80">
          <span className="flex-1 truncate">{link}</span>
          <button onClick={copy} className="rounded-pill border border-white/10 bg-white/5 px-2 py-1">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-white/70" />}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
