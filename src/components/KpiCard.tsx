/**
 * <KpiCard> — card compacta valor + label. Grid 2 col (móvil) / 5 col
 * (desktop) en el dashboard.
 */
import { cn } from "@/lib/utils";

interface KpiCardProps {
  value: string;
  label: string;
  className?: string;
}

export function KpiCard({ value, label, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface px-4 py-3 shadow-card",
        className,
      )}
    >
      <div className="text-xl font-extrabold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold text-muted">{label}</div>
    </div>
  );
}
