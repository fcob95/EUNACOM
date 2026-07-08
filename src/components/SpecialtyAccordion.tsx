"use client";

/**
 * <SpecialtyAccordion> — grupo por especialidad en el panel maestro.
 * Header: nombre + "8/24 completados" + ProgressBar agregada + chevron.
 * Auto-expande cuando hay búsqueda/filtros activos (controlado por `value`
 * desde el panel).
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProgressBar } from "@/components/ProgressBar";
import { ItemCard } from "@/components/ItemCard";
import type { Item, ItemProgress, SpecialtyWithItems } from "@/types/domain";
import { aggregate, type ProgressMap } from "@/features/progress/model";

interface SpecialtyAccordionProps {
  specialties: Array<SpecialtyWithItems & { visibleItems: Item[] }>;
  progressMap: ProgressMap;
  /** ids expandidos (controlado) */
  value: string[];
  onValueChange: (value: string[]) => void;
  onOpenItem: (item: Item) => void;
  onToggleStudied: (item: Item, progress: ItemProgress | undefined) => void;
  onCycleMastery: (item: Item, progress: ItemProgress | undefined) => void;
}

export function SpecialtyAccordion({
  specialties,
  progressMap,
  value,
  onValueChange,
  onOpenItem,
  onToggleStudied,
  onCycleMastery,
}: SpecialtyAccordionProps) {
  return (
    <Accordion
      type="multiple"
      value={value}
      onValueChange={onValueChange}
      className="flex flex-col gap-3"
    >
      {specialties.map((spec) => {
        const agg = aggregate(spec.items, progressMap);
        return (
          <AccordionItem key={spec.id} value={String(spec.id)}>
            <AccordionTrigger>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-extrabold">
                    {spec.name}
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-muted tabular-nums">
                    {agg.itemsDone}/{agg.itemsTotal} completados ·{" "}
                    {Math.round(agg.pct)}%
                  </span>
                </div>
                <ProgressBar
                  value={agg.pct}
                  variant="thin"
                  className="mt-2"
                  label={`Avance de ${spec.name}: ${Math.round(agg.pct)}%`}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {spec.items.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] font-semibold text-muted">
                  Contenido pendiente — se cargará próximamente.
                </p>
              ) : spec.visibleItems.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] font-semibold text-muted">
                  Sin resultados con los filtros actuales.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {spec.visibleItems.map((item) => {
                    const progress = progressMap.get(item.id);
                    return (
                      <li key={item.id}>
                        <ItemCard
                          item={item}
                          progress={progress}
                          onOpen={() => onOpenItem(item)}
                          onToggleStudied={() => onToggleStudied(item, progress)}
                          onCycleMastery={() => onCycleMastery(item, progress)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
