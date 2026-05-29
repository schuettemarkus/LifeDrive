import { Skeleton } from "@/components/glass/Skeleton";

export default function Loading() {
  return (
    <main className="px-4 pt-6 pb-32 space-y-3">
      <Skeleton height={68} />
      <Skeleton height={32} className="!rounded-pill" />
      <Skeleton height={56} />
      <Skeleton height={56} />
      <Skeleton height={56} />
      <Skeleton height={56} />
      <Skeleton height={56} />
    </main>
  );
}
