import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";
import { AreaPill } from "@/components/glass/AreaPill";

const LANES = ["backlog", "this week", "doing", "done"] as const;

const MOCK = {
  backlog: [
    { id: "p1", title: "Kitchen remodel", area: "home" },
    { id: "p2", title: "Travelfire rebuild", area: "career" },
    { id: "p3", title: "Sort pictures", area: "family" },
  ],
  "this week": [
    { id: "p4", title: "Nova passport", area: "family" },
    { id: "p5", title: "Garage hexagon lights", area: "home" },
  ],
  doing: [{ id: "p6", title: "Sonja cocktail menu", area: "creative" }],
  done: [{ id: "p7", title: "Bench workout", area: "health" }],
};

export default function BoardsPage() {
  return (
    <main>
      <PageHeader eyebrow="kanban" title="Boards" description="Drag across the week." />
      <section className="overflow-x-auto px-4 pt-5 pb-32">
        <div className="flex min-w-max gap-3">
          {LANES.map((lane) => (
            <div key={lane} className="w-64">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  {lane}
                </h2>
                <span className="text-[10px] text-white/35">{MOCK[lane].length}</span>
              </div>
              <div className="space-y-2">
                {MOCK[lane].map((c) => (
                  <GlassCard key={c.id} inset className="space-y-2">
                    <AreaPill area={c.area} size="xs" />
                    <p className="text-sm font-medium text-white/90">{c.title}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
