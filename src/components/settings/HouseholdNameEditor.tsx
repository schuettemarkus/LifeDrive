"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function HouseholdNameEditor({
  id,
  initial,
  canEdit,
}: {
  id: string;
  initial: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const next = name.trim();
    if (!next || next === initial) {
      setEditing(false);
      setName(initial);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/households/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return <span className="text-[22px] font-semibold tracking-tight text-white">{initial}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-2 text-[22px] font-semibold tracking-tight text-white"
      >
        <span>{initial}</span>
        <Pencil className="h-3.5 w-3.5 text-white/35 transition-colors group-hover:text-white/70" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") { setEditing(false); setName(initial); }
        }}
        className="rounded-2xl border border-white/15 bg-white/5 px-3 py-1.5 text-[18px] font-semibold tracking-tight text-white focus:border-accent-violet focus:outline-none"
        maxLength={80}
      />
      <button
        onClick={save}
        disabled={busy}
        aria-label="Save"
        className="grid h-8 w-8 place-items-center rounded-full bg-accent-gradient text-white shadow-glow disabled:opacity-60"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={() => { setEditing(false); setName(initial); }}
        aria-label="Cancel"
        className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70"
      >
        <X className="h-4 w-4" />
      </button>
      {err && <span className="text-[11px] text-red-300">{err}</span>}
    </div>
  );
}
