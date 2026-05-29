import { Skeleton } from "@/components/glass/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col px-4 pt-6 pb-32 space-y-4">
      <Skeleton height={92} />
      <Skeleton height={72} />
      <Skeleton height={180} />
      <Skeleton height={132} />
      <Skeleton height={132} />
    </main>
  );
}
