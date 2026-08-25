import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

export function GoalProgressDonut({
  year,
  currentAmountIdr,
  targetAmountIdr,
  progressPct,
  className,
}: {
  year: number;
  currentAmountIdr: number;
  targetAmountIdr: number;
  progressPct: number;
  className?: string;
}) {
  const clampedPct = Math.min(100, Math.max(0, progressPct));
  const progressText = `${clampedPct.toFixed(0)}%`;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center justify-center">
        <div
          className="relative grid size-44 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--primary) ${clampedPct}%, oklch(0.9 0.055 236) 0)`,
          }}
          aria-label={`${year} net worth goal progress ${progressText}`}
          role="img"
        >
          <div className="grid size-32 place-items-center rounded-full bg-white shadow-inner shadow-sky-950/10">
            <div className="text-center">
              <p className="text-3xl font-bold money-figures">{progressText}</p>
              <p className="text-xs font-semibold text-muted-foreground">{year} goal</p>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-3 text-center">
        <p className="text-sm text-muted-foreground">Current</p>
        <Money amountIdr={currentAmountIdr} className="text-lg font-bold money-figures" />
        <p className="mt-2 text-sm text-muted-foreground">
          of <Money amountIdr={targetAmountIdr} className="font-semibold money-figures" />
        </p>
      </div>
    </div>
  );
}
