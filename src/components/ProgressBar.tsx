/**
 * <ProgressBar> — el corazón visual de EunaTrack.
 * Variantes del diseño: thin (h-1.5, ItemCard) y thick (h-3, encabezados).
 * Fill teal → emerald al 100%. Animación transition-[width] 500ms.
 * Accesibilidad: nunca solo color — acompañar SIEMPRE de texto "n/5 · pct%"
 * (prop `label` o texto externo).
 */
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  variant?: "thin" | "thick";
  className?: string;
  /** aria-label descriptivo; por defecto "Avance: X%" */
  label?: string;
}

export function ProgressBar({
  value,
  variant = "thin",
  className,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Avance: ${Math.round(pct)}%`}
      className={cn(
        "w-full overflow-hidden rounded-full bg-track",
        variant === "thin" ? "h-1.5" : "h-3",
        className,
      )}
    >
      <div
        className={cn(
          "progress-fill h-full rounded-full",
          pct >= 100 ? "bg-done" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Texto companion estándar: "3/5 · 60%" */
export function ProgressLabel({
  done,
  total,
  pct,
  className,
}: {
  done: number;
  total: number;
  pct: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[12px] font-semibold whitespace-nowrap tabular-nums text-muted",
        className,
      )}
    >
      {done}/{total} · {Math.round(pct)}%
    </span>
  );
}
