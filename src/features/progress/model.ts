/**
 * FÓRMULA DE PROGRESO — fuente de verdad en TypeScript.
 * Espejo exacto de public.progress_pct() en SQL (0001_init.sql).
 * Cualquier cambio se hace EN AMBOS lados o en ninguno.
 * Ver .claude/skills/progress-model.
 */
import type { Item, ItemProgress } from "@/types/domain";

/** Las 5 dimensiones de seguimiento; cada una aporta 20%. */
export const PROGRESS_DIMS = [
  "studied",
  "review1",
  "review2",
  "questions_done",
  "cases_done",
] as const;
export type ProgressDim = (typeof PROGRESS_DIMS)[number];

export const DIM_LABELS: Record<ProgressDim, string> = {
  studied: "Estudiado",
  review1: "1er repaso",
  review2: "2º repaso",
  questions_done: "Preguntas",
  cases_done: "Casos clínicos",
};

export type ProgressMap = Map<number, ItemProgress>;

/** Dimensiones completadas de un registro (0–5). */
export function dimsDone(p: ItemProgress | undefined): number {
  if (!p) return 0;
  return PROGRESS_DIMS.reduce((acc, d) => acc + (p[d] ? 1 : 0), 0);
}

/**
 * Primera dimensión (en orden fijo PROGRESS_DIMS) aún no marcada, o null si
 * las 5 están completas. Recorre buscando la primera en false — NO indexa
 * por dimsDone(p), porque el popup de detalle permite marcarlas fuera de
 * orden (ej. cases_done=true con studied=false).
 */
export function nextIncompleteDim(p: ItemProgress | undefined): ProgressDim | null {
  for (const dim of PROGRESS_DIMS) {
    if (!(p?.[dim] ?? false)) return dim;
  }
  return null;
}

/**
 * Etapa más avanzada ya marcada ("Estudiado", "1er repaso", ...), para
 * mostrar en qué va el ítem de un vistazo. "Sin iniciar" con 0/5,
 * "Completado" con 5/5. Recorre PROGRESS_DIMS en reversa (no por índice de
 * conteo) para seguir siendo correcto si se marcó algo fuera de orden desde
 * el popup.
 */
export function currentStageLabel(p: ItemProgress | undefined): string {
  const done = dimsDone(p);
  if (done === 0) return "Sin iniciar";
  if (done >= PROGRESS_DIMS.length) return "Completado";
  const dim = [...PROGRESS_DIMS].reverse().find((d) => p?.[d]);
  return dim ? DIM_LABELS[dim] : "Sin iniciar";
}

/** % de avance de un ítem: 0, 20, 40, 60, 80 o 100. */
export function itemPct(p: ItemProgress | undefined): number {
  return dimsDone(p) * 20;
}

export type ItemStatus = "not_started" | "in_progress" | "done";

export function itemStatus(p: ItemProgress | undefined): ItemStatus {
  const pct = itemPct(p);
  if (pct === 0) return "not_started";
  if (pct >= 100) return "done";
  return "in_progress";
}

export interface Aggregate {
  itemsTotal: number;
  itemsDone: number;
  itemsInProgress: number;
  /** Promedio del pct de todos los ítems (los sin registro valen 0). */
  pct: number;
}

/** Agrega el avance de un conjunto de ítems (especialidad, área o global). */
export function aggregate(items: Item[], map: ProgressMap): Aggregate {
  if (items.length === 0)
    return { itemsTotal: 0, itemsDone: 0, itemsInProgress: 0, pct: 0 };
  let sum = 0;
  let done = 0;
  let inProgress = 0;
  for (const item of items) {
    const pct = itemPct(map.get(item.id));
    sum += pct;
    if (pct >= 100) done += 1;
    else if (pct > 0) inProgress += 1;
  }
  return {
    itemsTotal: items.length,
    itemsDone: done,
    itemsInProgress: inProgress,
    pct: Math.round((sum / items.length) * 10) / 10,
  };
}

/** Registro vacío para optimistic updates cuando aún no existe fila. */
export function emptyProgress(profileId: string, itemId: number): ItemProgress {
  return {
    profile_id: profileId,
    item_id: itemId,
    studied: false,
    review1: false,
    review2: false,
    questions_done: false,
    cases_done: false,
    mastery: null,
    last_studied_at: null,
    next_review_at: null,
    notes: "",
    updated_at: new Date().toISOString(),
  };
}
