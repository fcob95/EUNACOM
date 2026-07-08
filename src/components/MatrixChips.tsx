/**
 * <MatrixChips> — matriz de exigencia del internado (9 ejes).
 * Activos: chip teal suave con check. Inactivos: outline atenuado.
 * En móvil (compact) solo se muestran los activos.
 */
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  REQUIREMENT_KEYS,
  REQUIREMENT_LABELS,
  type RequirementKey,
} from "@/types/domain";
import { cn } from "@/lib/utils";

interface MatrixChipsProps {
  active: RequirementKey[];
  /** compact: solo activos (ItemCard móvil). full: los 9 ejes (detalle). */
  mode?: "compact" | "full";
  className?: string;
}

export function MatrixChips({ active, mode = "compact", className }: MatrixChipsProps) {
  const activeSet = new Set(active);
  const keys =
    mode === "full" ? REQUIREMENT_KEYS : REQUIREMENT_KEYS.filter((k) => activeSet.has(k));
  if (keys.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Exigencia del internado"
    >
      {keys.map((key) => {
        const isActive = activeSet.has(key);
        return (
          <li key={key}>
            <Badge
              variant={isActive ? "primary" : "outline"}
              size="sm"
              className={cn(!isActive && "opacity-60")}
            >
              {isActive && <Check className="size-3" aria-hidden />}
              {REQUIREMENT_LABELS[key as RequirementKey]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
