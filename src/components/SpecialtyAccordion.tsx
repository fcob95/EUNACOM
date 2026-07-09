"use client";

/**
 * <SpecialtyAccordion> — grupo por especialidad en el panel maestro, con un
 * segundo acordeón anidado por tema (subcapítulo) dentro de cada una.
 * Header: nombre + "8/24 completados" + ProgressBar agregada + chevron, en
 * ambos niveles. Auto-expande especialidades Y temas con resultados cuando
 * hay búsqueda/filtros activos (controlado por `value`/`topicValue` desde
 * el panel).
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProgressBar } from "@/components/ProgressBar";
import { ItemCard } from "@/components/ItemCard";
import type { Item, ItemProgress, SpecialtyWithTopics, TopicWithItems } from "@/types/domain";
import { aggregate, type ProgressMap } from "@/features/progress/model";

interface VisibleTopic extends TopicWithItems {
  visibleItems: Item[];
}

interface VisibleSpecialty extends Omit<SpecialtyWithTopics, "topics"> {
  topics: VisibleTopic[];
}

interface SpecialtyAccordionProps {
  specialties: VisibleSpecialty[];
  progressMap: ProgressMap;
  /** ids expandidos (controlado), a nivel de especialidad */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** ids de tema expandidos (controlado); globales, no por especialidad */
  topicValue: string[];
  onTopicValueChange: (value: string[]) => void;
  onOpenItem: (item: Item) => void;
  onAdvanceProgress: (item: Item, progress: ItemProgress | undefined) => void;
  onCycleMastery: (item: Item, progress: ItemProgress | undefined) => void;
}

export function SpecialtyAccordion({
  specialties,
  progressMap,
  value,
  onValueChange,
  topicValue,
  onTopicValueChange,
  onOpenItem,
  onAdvanceProgress,
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
              {spec.topics.length === 0 ? (
                <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13px] font-semibold text-muted">
                  Contenido pendiente — se cargará próximamente.
                </p>
              ) : (
                <Accordion
                  type="multiple"
                  value={topicValue}
                  onValueChange={onTopicValueChange}
                  className="flex flex-col gap-2"
                >
                  {spec.topics.map((topic) => {
                    const topicAgg = aggregate(topic.items, progressMap);
                    return (
                      <AccordionItem
                        key={topic.id}
                        value={String(topic.id)}
                        className="border-border/70 bg-surface-2 shadow-none"
                      >
                        <AccordionTrigger className="min-h-12 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-[13.5px] font-bold">
                                {topic.name}
                              </span>
                              <span className="shrink-0 text-[11.5px] font-semibold text-muted tabular-nums">
                                {topicAgg.itemsDone}/{topicAgg.itemsTotal} ·{" "}
                                {Math.round(topicAgg.pct)}%
                              </span>
                            </div>
                            <ProgressBar
                              value={topicAgg.pct}
                              variant="thin"
                              className="mt-1.5"
                              label={`Avance de ${topic.name}: ${Math.round(topicAgg.pct)}%`}
                            />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {topic.visibleItems.length === 0 ? (
                            <p className="rounded-xl bg-surface px-4 py-6 text-center text-[13px] font-semibold text-muted">
                              Sin resultados con los filtros actuales.
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {topic.visibleItems.map((item) => {
                                const progress = progressMap.get(item.id);
                                return (
                                  <li key={item.id}>
                                    <ItemCard
                                      item={item}
                                      progress={progress}
                                      onOpen={() => onOpenItem(item)}
                                      onAdvanceProgress={() =>
                                        onAdvanceProgress(item, progress)
                                      }
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
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
