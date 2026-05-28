import { areaColor, areaName, type LifeAreaKey } from "@/lib/design";
import { cn } from "@/lib/utils";

export function AreaPill({
  area,
  size = "sm",
  className,
}: {
  area: LifeAreaKey | string | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const c = areaColor(area);
  const padding = size === "xs" ? "px-2 py-0.5 text-[10px]" : size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium tracking-tight",
        padding,
        className,
      )}
      style={{
        background: `${c}1F`,
        color: c,
        border: `1px solid ${c}33`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {areaName(area).toLowerCase()}
    </span>
  );
}
