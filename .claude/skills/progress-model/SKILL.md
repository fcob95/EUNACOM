---
name: progress-model
description: La fórmula de progreso de EunaTrack (5 dimensiones × 20%), dónde vive en SQL y en TypeScript, y cómo se agrega por especialidad/área. Úsala SIEMPRE que un cambio toque cálculo, visualización o persistencia de progreso.
---

# Modelo de progreso (5 × 20%)

## La fórmula
```
pct(item) = (studied + review1 + review2 + questions_done + cases_done) × 20
```
Cinco dimensiones booleanas, cada una aporta exactamente 20%. Un ítem con studied +
review1 = 40%. No hay ponderaciones distintas ni dimensiones parciales.

## Agregación (especialidad / área / global)
- Agregado = **PROMEDIO del pct de TODOS los ítems** del grupo.
- Ítems sin fila en `item_progress` cuentan como **0** (por eso el SQL hace
  `left join` + `coalesce(pct, 0)`), nunca se excluyen del denominador.
- `items_done` = ítems con pct = 100.

## Dónde vive (dos lados, SIEMPRE consistentes)
1. **SQL** (`supabase/migrations/0001_init.sql`):
   - `progress_pct(item_progress)` — la fórmula.
   - Vistas con `security_invoker`: `v_item_progress_pct` (pct por ítem, sin fila = 0),
     `v_specialty_progress` y `v_area_progress` (promedio + items_total/items_done).
2. **TypeScript** (`src/features/progress/model.ts`):
```ts
export const DIMENSIONS = [
  "studied", "review1", "review2", "questions_done", "cases_done",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const PCT_PER_DIMENSION = 100 / DIMENSIONS.length; // 20

/** Espejo exacto de progress_pct() en SQL. */
export function itemPct(row: Pick<ItemProgressRow, Dimension> | undefined): number {
  if (!row) return 0; // sin fila = 0, igual que el left join en SQL
  return DIMENSIONS.reduce((sum, d) => sum + (row[d] ? PCT_PER_DIMENSION : 0), 0);
}

/** Espejo de las vistas de agregación: promedio sobre TODOS los ítems. */
export function aggregatePct(itemIds: number[], map: ProgressMap): number {
  if (itemIds.length === 0) return 0;
  const total = itemIds.reduce((sum, id) => sum + itemPct(map[id]), 0);
  return total / itemIds.length;
}
```

## Quién usa qué
- Lecturas "en frío" (dashboard, panel al cargar): vistas SQL — más baratas y ya
  filtradas por RLS.
- Actualización instantánea (toggle de dimensión → ProgressBar): `itemPct`/`aggregatePct`
  en TS sobre la caché optimista de react-query (ver skill `supabase-patterns`);
  `onSettled` reconcilia con las vistas.

## LA regla
Cualquier cambio a la fórmula, a las dimensiones o a la agregación se hace **EN AMBOS
LADOS (SQL nueva migración + TS) o en ninguno**. Un PR que toque solo un lado está mal
por definición. El planificador también depende de esto: prioriza Medicina Interna y se
recalcula según el avance real (estos pct).
