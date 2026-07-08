/**
 * Planificador de estudio diario.
 * Reglas:
 *  · Los REPASOS vencidos (next_review_at ≤ hoy) van siempre primero.
 *  · El resto del cupo (items_per_day) se llena con ítems NUEVOS
 *    (no estudiados), priorizando el área con menor sort_order
 *    (Medicina Interna es sort_order=1 en el seed → prioridad por DATOS,
 *    no por código) y luego especialidad/ítem en orden del programa.
 *  · Se recalcula con el avance real: lo completado deja de aparecer.
 * Intervalos de repaso espaciado al marcar en el planificador:
 *  estudiado → +7 días · 1er repaso → +21 días · 2º repaso → sin próximo.
 */
import type { ContentTree } from "@/features/content/useContent";
import type { Item } from "@/types/domain";
import { itemPct, type ProgressMap } from "@/features/progress/model";

export const REVIEW_INTERVAL_AFTER_STUDY = 7;
export const REVIEW_INTERVAL_AFTER_R1 = 21;

export type PlanEntryKind = "repaso" | "nuevo";

export interface PlanEntry {
  item: Item;
  specialtyName: string;
  kind: PlanEntryKind;
  /** Para repasos: fecha programada (puede ser pasada = atrasado). */
  dueDate: string | null;
}

export interface DayPlan {
  today: PlanEntry[];
  /** Repasos futuros (próximos 14 días), ordenados por fecha. */
  upcoming: PlanEntry[];
}

export function computePlan(
  content: ContentTree,
  progress: ProgressMap,
  itemsPerDay: number,
  todayIso: string,
): DayPlan {
  const specialtyName = (item: Item) =>
    content.specialtyById.get(item.specialty_id)?.name ?? "";

  const areaPriority = (item: Item) => {
    const spec = content.specialtyById.get(item.specialty_id);
    const area = spec ? content.areaById.get(spec.area_id) : undefined;
    return area?.sort_order ?? Number.MAX_SAFE_INTEGER;
  };

  // 1 · Repasos: pendientes de hoy o atrasados, aún no 100%.
  const dueReviews: PlanEntry[] = [];
  const upcoming: PlanEntry[] = [];
  for (const item of content.items) {
    const p = progress.get(item.id);
    if (!p?.next_review_at || itemPct(p) >= 100) continue;
    const entry: PlanEntry = {
      item,
      specialtyName: specialtyName(item),
      kind: "repaso",
      dueDate: p.next_review_at,
    };
    if (p.next_review_at <= todayIso) dueReviews.push(entry);
    else upcoming.push(entry);
  }
  dueReviews.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  upcoming.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  // 2 · Nuevos: no estudiados, priorizando área (sort_order) → programa.
  const slotsLeft = Math.max(0, itemsPerDay - dueReviews.length);
  const fresh: PlanEntry[] = content.items
    .filter((item) => {
      const p = progress.get(item.id);
      return !p?.studied;
    })
    .sort((a, b) => {
      const areaDiff = areaPriority(a) - areaPriority(b);
      if (areaDiff !== 0) return areaDiff;
      const specA = content.specialtyById.get(a.specialty_id)?.sort_order ?? 0;
      const specB = content.specialtyById.get(b.specialty_id)?.sort_order ?? 0;
      return specA - specB || a.sort_order - b.sort_order;
    })
    .slice(0, slotsLeft)
    .map((item) => ({
      item,
      specialtyName: specialtyName(item),
      kind: "nuevo" as const,
      dueDate: null,
    }));

  return { today: [...dueReviews, ...fresh], upcoming: upcoming.slice(0, 20) };
}
