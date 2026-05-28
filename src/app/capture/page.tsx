import { PageHeader } from "@/components/glass/PageHeader";
import { CaptureForm } from "@/components/capture/CaptureForm";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; title?: string; url?: string }>;
}) {
  const sp = await searchParams;
  const initial = [sp.title, sp.text, sp.url].filter(Boolean).join("\n");
  return (
    <main>
      <PageHeader
        eyebrow="brain dump"
        title="What's on your mind?"
        description="Type or dictate everything. The AI sorts, estimates, and parks it where it belongs."
      />
      <CaptureForm initial={initial} />
    </main>
  );
}
