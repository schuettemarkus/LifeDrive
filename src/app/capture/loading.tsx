import { Skeleton } from "@/components/glass/Skeleton";

export default function Loading() {
  return (
    <main className="px-4 pt-6 pb-32 space-y-3">
      <Skeleton height={68} />
      <Skeleton height={220} />
      <div className="flex justify-between">
        <Skeleton height={40} className="w-24" />
        <Skeleton height={40} className="w-32" />
      </div>
    </main>
  );
}
