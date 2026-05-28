import { PageHeader } from "@/components/glass/PageHeader";
import { GlassCard } from "@/components/glass/GlassCard";

export default function OfflinePage() {
  return (
    <main>
      <PageHeader title="No signal" description="Your captures are saved locally and will sync when you're back online." />
      <section className="px-4 pt-5 pb-32">
        <GlassCard inset variant="subtle">
          <p className="text-sm text-white/75">
            Today's plan is still cached on this device. Open the Drive to keep going.
          </p>
        </GlassCard>
      </section>
    </main>
  );
}
