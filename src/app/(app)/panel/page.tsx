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
  type ProgressMap,
} from "@/features/progress/model";
import type { Item, ItemProgress } from "@/types/domain";
import { todayISO, addDaysISO } from "@/lib/utils";
import { REVIEW_INTERVAL_AFTER_STUDY } from "@/features/planner/model";

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
  const [openItem, setOpenItem] = useState<Item | null>(null);

  const progressMap: ProgressMap = useMemo(
    () => progress.data ?? new Map(),
    [progress.data],
  );

  const filterActive = search.trim() !== "" || countActiveFilters(filters) > 0;

  const visible = useMemo(() => {
    if (!content.data) return [];
    const q = norm(search.trim());
    return content.data.specialties.map((spec) => ({
      ...spec,
      visibleItems: spec.items.filter((item) => {
        if (q && !norm(item.title).includes(q)) return false;
        if (filters.type !== "all" && item.item_type !== filters.type) return false;
        const p = progressMap.get(item.id);
        if (filters.status !== "all" && itemStatus(p) !== filters.status)
          return false;
        if (filters.mastery > 0 && (p?.mastery ?? 0) !== filters.mastery)
          return false;
        return true;
      }),
    }));
  }, [content.data, search, filters, progressMap]);

  // Con búsqueda/filtros: auto-expandir especialidades con resultados.
  const accordionValue = filterActive
    ? visible.filter((s) => s.visibleItems.length > 0).map((s) => String(s.id))
    : expanded;

  const global = useMemo(
    () => aggregate(content.data?.items ?? [], progressMap),
    [content.data, progressMap],
  );

  const toggleStudied = (item: Item, p: ItemProgress | undefined) => {
    const next = !(p?.studied ?? false);
    update.mutate({
      itemId: item.id,
      patch: next
        ? {
            studied: true,
            last_studied_at: todayISO(),
            ...(p?.review1
              ? {}
              : { next_review_at: addDaysISO(todayISO(), REVIEW_INTERVAL_AFTER_STUDY) }),
          }
        : { studied: false },
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
      {visible.every((s) => s.visibleItems.length === 0) && filterActive ? (
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
          onOpenItem={setOpenItem}
          onToggleStudied={toggleStudied}
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
