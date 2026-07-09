"use client";

/**
 * <RecencyHeatmap> — "sin avance reciente": un cuadrito por ítem, agrupado
 * por especialidad. Mientras más tenue, más tiempo pasó desde el último
 * avance (nunca estudiado = lo más tenue). Clic en un cuadrito abre el
 * detalle de ese ítem. Celdas de 44px (target táctil) pegadas entre sí, sin
 * gap ni relleno interno — el color llena toda la celda para que se lea
 * como mosaico continuo, no puntos sueltos.
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
      <div className="mt-4 flex flex-col gap-4">
        {populated.map((spec) => (
          <div key={spec.id}>
            <h3 className="mb-1.5 text-[13px] font-bold text-muted">
              {spec.name}
            </h3>
            <div
              className="grid gap-0"
              style={{ gridTemplateColumns: "repeat(auto-fill, 44px)" }}
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
