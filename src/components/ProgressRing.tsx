/**
 * <ProgressRing> — anillo SVG radial animado (stroke-dashoffset).
 * Tamaños del diseño: 56px (header del panel) y 172px (dashboard).
 */
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** contenido central (p.ej. "42%") — si se omite, se muestra el pct */
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 56,
  strokeWidth,
  className,
  children,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const sw = strokeWidth ?? Math.max(4, Math.round(size / 12));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const isDone = pct >= 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Avance global: ${Math.round(pct)}%`}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--track)"
          strokeWidth={sw}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={isDone ? "var(--done)" : "var(--primary)"}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span
            className="font-extrabold tracking-tight tabular-nums"
            style={{ fontSize: size / 4 }}
          >
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}
