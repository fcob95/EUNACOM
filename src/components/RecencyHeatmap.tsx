"use client";

/**
 * <RecencyHeatmap> — "sin avance reciente": nombre de especialidad como
 * llave + un rectángulo de cuadritos (uno por ítem). Mientras más tenue,
 * más tiempo pasó desde el último avance (nunca estudiado = lo más tenue).
 * Clic en un cuadrito abre el detalle de ese ítem. Celdas de 44px (target
 * táctil) pegadas entre sí, sin gap. Todos los rectángulos comparten el
 * mismo ancho disponible → misma cantidad de columnas automáticamente (sin
 * calcular nada); cada especialidad solo varía en cuántas filas ocupa según
 * su cantidad de ítems.
 * En móvil la etiqueta va ARRIBA del rectángulo (deja todo el ancho para
 * columnas, evita rectángulos angostos y muy altos); desde `sm` para arriba
 * va a la IZQUIERDA (hay ancho de sobra para ambos).
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
          <div
            key={spec.id}
            className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-2"
          >
            <span
              className="truncate text-[11.5px] font-bold text-muted sm:w-32 sm:shrink-0 sm:pt-1"
              title={spec.name}
            >
              {spec.name}
            </span>
            <div
              className="grid w-full gap-0 sm:w-auto sm:min-w-0 sm:flex-1"
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
