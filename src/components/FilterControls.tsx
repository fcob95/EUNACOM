"use client";

/**
 * <FilterChips> (desktop, fila de chips) y <FilterSheet> (móvil, bottom
 * sheet) — filtros del panel: estado, tipo, dominio. Badge contador de
 * filtros activos en el botón que abre el sheet.
 */
import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PanelFilters {
  status: "all" | "not_started" | "in_progress" | "done";
  type: "all" | "tema" | "examen_complementario";
  mastery: number; // 0 = todos
}

export const EMPTY_FILTERS: PanelFilters = {
  status: "all",
  type: "all",
  mastery: 0,
};

export function countActiveFilters(f: PanelFilters): number {
  return (
    (f.status !== "all" ? 1 : 0) + (f.type !== "all" ? 1 : 0) + (f.mastery > 0 ? 1 : 0)
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "not_started", label: "No iniciado" },
  { value: "in_progress", label: "En progreso" },
  { value: "done", label: "Completado" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "tema", label: "Temas" },
  { value: "examen_complementario", label: "Exámenes" },
] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "pressable h-11 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap",
        active
          ? "border-transparent bg-primary-soft text-primary-text"
          : "border-border bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroups({
  filters,
  onChange,
}: {
  filters: PanelFilters;
  onChange: (f: PanelFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section>
        <Label className="mb-2 block">Estado</Label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              active={filters.status === o.value}
              onClick={() => onChange({ ...filters, status: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <Label className="mb-2 block">Tipo</Label>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              active={filters.type === o.value}
              onClick={() => onChange({ ...filters, type: o.value })}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </section>
      <section>
        <Label className="mb-2 block">Dominio</Label>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={filters.mastery === 0}
            onClick={() => onChange({ ...filters, mastery: 0 })}
          >
            Todos
          </Chip>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip
              key={n}
              active={filters.mastery === n}
              onClick={() => onChange({ ...filters, mastery: n })}
            >
              {n}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Desktop (≥sm): chips inline. */
export function FilterChips(props: {
  filters: PanelFilters;
  onChange: (f: PanelFilters) => void;
}) {
  return (
    <div className="hidden sm:block">
      <FilterGroups {...props} />
    </div>
  );
}

/** Móvil (<sm): botón con contador que abre bottom sheet. */
export function FilterSheet({
  filters,
  onChange,
  open,
  onOpenChange,
}: {
  filters: PanelFilters;
  onChange: (f: PanelFilters) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const count = countActiveFilters(filters);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative sm:hidden"
          aria-label={`Filtros${count > 0 ? ` (${count} activos)` : ""}`}
        >
          <SlidersHorizontal className="size-5" />
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
              aria-hidden
            >
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent title="Filtros" description="Filtra el temario">
        <div className="pt-2 pb-1">
          <FilterGroups filters={filters} onChange={onChange} />
          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              Limpiar
            </Button>
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Ver resultados
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
