"use client";

/**
 * <ItemCard> — tarjeta de ítem del panel maestro.
 * Dot semáforo + título + badge EXAMEN + ProgressBar thin con "n/5 · pct%"
 * + chip de dominio (tap sube nivel) + MatrixChips (móvil: solo activos)
 * + avance rápido (cada tap marca la siguiente dimensión pendiente, cicla
 * a 0/5 al llegar a completo). Tap en la card abre el detalle.
 */
import { Check } from "lucide-react";
import type { Item, ItemProgress } from "@/types/domain";
import {
  DIM_LABELS,
  dimsDone,
  itemPct,
  itemStatus,
  nextIncompleteDim,
  type ItemStatus,
} from "@/features/progress/model";
import { ProgressBar, ProgressLabel } from "@/components/ProgressBar";
import { DomainChip } from "@/components/DomainSelector";
import { MatrixChips } from "@/components/MatrixChips";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<ItemStatus, string> = {
  not_started: "bg-neutral-dot",
  in_progress: "bg-in-progress",
  done: "bg-done",
};
const STATUS_TEXT: Record<ItemStatus, string> = {
  not_started: "No iniciado",
  in_progress: "En progreso",
  done: "Completado",
};

interface ItemCardProps {
  item: Item;
  progress: ItemProgress | undefined;
  onOpen: () => void;
  onAdvanceProgress: () => void;
  onCycleMastery: () => void;
}

export function ItemCard({
  item,
  progress,
  onOpen,
  onAdvanceProgress,
  onCycleMastery,
}: ItemCardProps) {
  const pct = itemPct(progress);
  const status = itemStatus(progress);
  const done = dimsDone(progress);
  const nextDim = nextIncompleteDim(progress);
  const advanceLabel =
    nextDim === null
      ? "Completado (5/5). Toca para reiniciar."
      : `Marcar "${DIM_LABELS[nextDim]}" (${done}/5). Toca para avanzar.`;

  return (
    <div
      className="rounded-2xl border border-border bg-surface p-3 shadow-card"
      data-testid="item-card"
    >
      <div className="flex items-start gap-3">
        {/* zona clickeable → detalle */}
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-2.5 text-left"
          aria-label={`${item.title}. ${STATUS_TEXT[status]}, ${Math.round(pct)}%. Abrir detalle.`}
        >
          <span
            className={cn("mt-1.5 size-3 shrink-0 rounded-full", STATUS_DOT[status])}
            title={STATUS_TEXT[status]}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm leading-[1.4] font-semibold">
              {item.title}
            </span>
            {item.item_type === "examen_complementario" && (
              <Badge variant="exam" size="sm" className="mt-1">
                Examen
              </Badge>
            )}
          </span>
        </button>

        <DomainChip value={progress?.mastery ?? null} onCycle={onCycleMastery} />

        {/* avance rápido: cada tap marca la siguiente dimensión pendiente (≥44px) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdvanceProgress();
          }}
          aria-label={advanceLabel}
          className={cn(
            "pressable flex size-11 shrink-0 items-center justify-center rounded-xl border",
            done >= 5
              ? "border-transparent bg-primary text-white"
              : "border-border bg-surface-2 text-faint",
          )}
        >
          <Check className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5 pl-[22px]">
        <ProgressBar value={pct} variant="thin" className="flex-1" label={`Avance de ${item.title}`} />
        <ProgressLabel done={dimsDone(progress)} total={5} pct={pct} />
      </div>

      {item.requirements.length > 0 && (
        <MatrixChips
          active={item.requirements}
          mode="compact"
          className="mt-2 pl-[22px]"
        />
      )}
    </div>
  );
}
