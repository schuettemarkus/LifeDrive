export function Skeleton({
  className = "",
  height,
}: {
  className?: string;
  height?: number | string;
}) {
  return (
    <div
      className={`animate-pulse rounded-glass bg-white/[0.05] ${className}`}
      style={typeof height !== "undefined" ? { height } : undefined}
    />
  );
}
