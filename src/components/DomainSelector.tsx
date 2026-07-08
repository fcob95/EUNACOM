"use client";

/**
 * <DomainSelector> — segmented 1–5, botones ≥48px, cada nivel con su color
 * al activarse + etiqueta bajo el grupo ("Aceptable").
 */
import { MASTERY_LABELS } from "@/types/domain";
import { cn } from "@/lib/utils";

const DOMAIN_BG = [
  "data-[active=true]:bg-domain-1",
  "data-[active=true]:bg-domain-2",
  "data-[active=true]:bg-domain-3",
  "data-[active=true]:bg-domain-4",
  "data-[active=true]:bg-domain-5",
] as const;

interface DomainSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}

export function DomainSelector({ value, onChange, className }: DomainSelectorProps) {
  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Nivel de dominio (1 a 5)"
        className="grid grid-cols-5 gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const active = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Dominio ${level}: ${MASTERY_LABELS[level]}`}
              data-active={active}
              onClick={() => onChange(active ? null : level)}
              className={cn(
                "pressable flex h-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-[17px] font-extrabold text-muted",
                "data-[active=true]:border-transparent data-[active=true]:text-white",
                DOMAIN_BG[level - 1],
              )}
            >
              {level}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 min-h-4 text-center text-[12px] font-semibold text-muted">
        {value ? MASTERY_LABELS[value] : "Sin evaluar"}
      </p>
    </div>
  );
}

/** Chip compacto de dominio para ItemCard (tap = subir nivel cíclico). */
export function DomainChip({
  value,
  onCycle,
  className,
}: {
  value: number | null;
  onCycle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCycle();
      }}
      aria-label={
        value
          ? `Dominio ${value} de 5 (${MASTERY_LABELS[value]}). Tocar para subir.`
          : "Sin dominio evaluado. Tocar para evaluar."
      }
      className={cn(
        "pressable flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-[15px] font-extrabold",
        value ? "border-transparent text-white" : "bg-surface-2 text-faint",
        className,
      )}
      style={
        value ? { backgroundColor: `var(--domain-${value})` } : undefined
      }
    >
      {value ?? "–"}
    </button>
  );
}
