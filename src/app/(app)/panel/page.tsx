"use client";

/**
 * Panel maestro: temario área → especialidad → ítem con búsqueda, filtros,
 * acordeones y edición en sheet/dialog. Optimistic updates: la barra se
 * llena al instante.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";
import { SpecialtyAccordion } from "@/components/SpecialtyAccordion";
import { ItemDetailSheet } from "@/components/ItemDetailSheet";
import {
  EMPTY_FILTERS,
  FilterChips,
  FilterSheet,
  countActiveFilters,
  type PanelFilters,
} from "@/components/FilterControls";
import { useContent } from "@/features/content/useContent";
import { useProgressMap, useUpdateProgress } from "@/features/progress/useProgress";
import {
  aggregate,
  itemStatus,
  nextIncompleteDim,
  PROGRESS_DIMS,
  type ProgressMap,
} from "@/features/progress/model";
import type { Item, ItemProgress } from "@/types/domain";
import { todayISO } from "@/lib/utils";
import { nextReviewPatch } from "@/features/planner/model";

/** Búsqueda sin tildes ni mayúsculas. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function PanelPage() {
  const content = useContent();
  const progress = useProgressMap();
  const update = useUpdateProgress();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PanelFilters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [openItem, setOpenItem] = useState<Item | null>(null);

  const progressMap: ProgressMap = useMemo(
    () => progress.data ?? new Map(),
    [progress.data],
  );

  const filterActive = search.trim() !== "" || countActiveFilters(filters) > 0;

  const visible = useMemo(() => {
    if (!content.data) return [];
    const q = norm(search.trim());
    const matchesItem = (item: Item) => {
      if (q && !norm(item.title).includes(q)) return false;
      if (filters.type !== "all" && item.item_type !== filters.type) return false;
      const p = progressMap.get(item.id);
      if (filters.status !== "all" && itemStatus(p) !== filters.status)
        return false;
      if (filters.mastery > 0 && (p?.mastery ?? 0) !== filters.mastery)
        return false;
      return true;
    };
    return content.data.specialties.map((spec) => ({
      ...spec,
      topics: spec.topics.map((topic) => ({
        ...topic,
        visibleItems: topic.items.filter(matchesItem),
      })),
    }));
  }, [content.data, search, filters, progressMap]);

  const hasAnyVisible = visible.some((s) =>
    s.topics.some((t) => t.visibleItems.length > 0),
  );

  // Con búsqueda/filtros: auto-expandir especialidades y temas con resultados.
  const accordionValue = filterActive
    ? visible
        .filter((s) => s.topics.some((t) => t.visibleItems.length > 0))
        .map((s) => String(s.id))
    : expanded;
  const topicAccordionValue = filterActive
    ? visible.flatMap((s) =>
        s.topics.filter((t) => t.visibleItems.length > 0).map((t) => String(t.id)),
      )
    : expandedTopics;

  const global = useMemo(
    () => aggregate(content.data?.items ?? [], progressMap),
    [content.data, progressMap],
  );

  const advanceProgress = (item: Item, p: ItemProgress | undefined) => {
    const dim = nextIncompleteDim(p);
    if (dim === null) {
      // 5/5 -> reinicia las 5 dimensiones (ciclo completo).
      const reset = Object.fromEntries(PROGRESS_DIMS.map((d) => [d, false]));
      update.mutate({ itemId: item.id, patch: reset });
      return;
    }
    update.mutate({
      itemId: item.id,
      patch: {
        [dim]: true,
        last_studied_at: todayISO(),
        ...nextReviewPatch(dim, p),
      },
    });
  };

  const cycleMastery = (item: Item, p: ItemProgress | undefined) => {
    const current = p?.mastery ?? 0;
    update.mutate({
      itemId: item.id,
      patch: { mastery: current >= 5 ? null : current + 1 },
    });
  };

  // ── estados de pantalla ──
  if (content.isLoading || progress.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (content.isError || progress.isError) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <p className="font-semibold">No se pudo cargar el temario.</p>
        <p className="mt-1 text-[13px] text-muted">
          Revisa tu conexión o la configuración de Supabase.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            void content.refetch();
            void progress.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const specialty = openItem
    ? content.data?.specialtyById.get(openItem.specialty_id)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* header con anillo global */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Panel maestro</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {global.itemsDone}/{global.itemsTotal} ítems completados
          </p>
        </div>
        <ProgressRing value={global.pct} size={56} />
      </header>

      {/* búsqueda + filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar tema o examen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar en el temario"
            className="pl-10"
          />
        </div>
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
        />
      </div>
      <FilterChips filters={filters} onChange={setFilters} />

      {/* lista */}
      {!hasAnyVisible && filterActive ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <p className="font-semibold">Sin resultados</p>
          <p className="mt-1 text-[13px] text-muted">
            Prueba con otro término o limpia los filtros.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setFilters(EMPTY_FILTERS);
            }}
          >
            Limpiar todo
          </Button>
        </div>
      ) : (
        <SpecialtyAccordion
          specialties={visible}
          progressMap={progressMap}
          value={accordionValue}
          onValueChange={setExpanded}
          topicValue={topicAccordionValue}
          onTopicValueChange={setExpandedTopics}
          onOpenItem={setOpenItem}
          onAdvanceProgress={advanceProgress}
          onCycleMastery={cycleMastery}
        />
      )}

      <ItemDetailSheet
        item={openItem}
        progress={openItem ? progressMap.get(openItem.id) : undefined}
        specialtyName={specialty?.name ?? ""}
        onClose={() => setOpenItem(null)}
      />
    </div>
  );
}
