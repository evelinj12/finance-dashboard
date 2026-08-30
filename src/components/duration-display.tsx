import { formatDecimalHours, formatHoursAsDuration } from "@/lib/duration";

export function DurationDisplay({
  hours,
  align = "right",
  className = "",
}: {
  hours: number | null | undefined;
  align?: "left" | "right";
  className?: string;
}) {
  if (hours === null || hours === undefined) return <span>-</span>;

  return (
    <span
      className={`inline-flex flex-col ${align === "left" ? "items-start" : "items-end"} leading-tight tabular-nums ${className}`}
    >
      <span>{formatHoursAsDuration(hours)}</span>
      <span className="text-xs text-muted-foreground">{formatDecimalHours(hours)} hrs</span>
    </span>
  );
}
