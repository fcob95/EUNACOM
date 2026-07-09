"use client";

/**
 * <RecencyHeatmap> — "sin avance reciente": una fila por especialidad
 * (nombre a la izquierda, como llave) + tira horizontal de cuadritos, uno
 * por ítem. Mientras más tenue, más tiempo pasó desde el último avance
 * (nunca estudiado = lo más tenue). Clic en un cuadrito abre el detalle de
 * ese ítem. Celdas de 44px (target táctil) pegadas entre sí, sin gap — cada
 * fila es una sola línea con scroll horizontal propio cuando no caben todos
 * los ítems (evita tener que achicar los cuadros bajo el mínimo táctil).
 */
import { cn, todayISO } from "@/lib/utils";
import {
  dimsDone,
  formatDaysAgo,
  recencyOpacity,
  PROGRESS_DIMS,
} from "@/features/progress/model";
import type { Item, SpecialtyWithTopics } from "@/types/domain";
import type { ProgressMap } from "@/features/progress/model";

interface RecencyHeatmapProps {
  specialties: SpecialtyWithTopics[];
  progressMap: ProgressMap;
  onOpenItem: (item: Item) => void;
}

export function RecencyHeatmap({
  specialties,
  progressMap,
  onOpenItem,
}: RecencyHeatmapProps) {
  const today = todayISO();
  const populated = specialties.filter((s) => s.items.length > 0);

  if (populated.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-extrabold">Sin avance reciente</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        Más tenue = más tiempo sin tocar ese ítem. Toca un cuadrito para ver
        el detalle.
      </p>
      <div className="mt-4 flex flex-col divide-y divide-border">
        {populated.map((spec) => (
          <div key={spec.id} className="flex items-center gap-2 py-1.5">
            <span
              className="w-20 shrink-0 truncate text-[11.5px] font-bold text-muted sm:w-32"
              title={spec.name}
            >
              {spec.name}
            </span>
            <div
              className="flex flex-1 gap-0 overflow-x-auto"
              role="group"
              aria-label={`Avance reciente de ${spec.name}`}
            >
              {spec.items.map((item) => {
                const p = progressMap.get(item.id);
                const opacity = recencyOpacity(p?.last_studied_at ?? null, today);
                const done = dimsDone(p) >= PROGRESS_DIMS.length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className={cn(
                      "pressable size-11 shrink-0 bg-primary",
                      done && "ring-1 ring-inset ring-done",
                    )}
                    style={{ opacity }}
                    aria-label={`${item.title}. ${formatDaysAgo(p?.last_studied_at ?? null, today)}. Abrir detalle.`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
