import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function OnboardingPage() {
  return (
    <main>
      <PageHeader
        eyebrow="welcome"
        title="Let's set up your Life Drive"
        description="Connect Google, name your household, pick your focus windows."
      />
      <section className="px-4 pt-5 pb-32 space-y-3">
        {[
          { step: "1", title: "Connect Google Calendar", body: "Two-way sync. We only edit events Life Drive created." },
          { step: "2", title: "Name your household", body: "Invite Sarah. Everything you build is shared by default." },
          { step: "3", title: "Working hours + focus windows", body: "6am–9pm, with deep work blocks at 6–7am and 10am–12pm." },
          { step: "4", title: "Pick your life areas", body: "Family, Health, Home, Career, Money, Growth, Creative." },
          { step: "5", title: "First brain dump", body: "Drop everything. We'll sort it." },
        ].map((s) => (
          <GlassCard key={s.step} inset className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-bold text-white">
              {s.step}
            </span>
            <div>
              <p className="font-medium text-white">{s.title}</p>
              <p className="text-xs text-white/55">{s.body}</p>
            </div>
          </GlassCard>
        ))}
      </section>
    </main>
  );
}
