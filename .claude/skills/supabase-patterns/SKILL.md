---
name: supabase-patterns
description: Patrones de este repo para hablar con Supabase, cliente tipado, sesión anónima + login_with_rut, hooks react-query con queryKeys tipados y optimistic updates. Úsala al crear/modificar cualquier hook de datos, mutación o el flujo de auth.
---

# Patrones Supabase del repo

## Cliente (src/lib/supabase.ts)
Único cliente browser, tipado con los tipos generados:
```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```
Tras cambios de esquema: `pnpm db:types` (nunca editar `src/types/supabase.ts` a mano).

## Auth por RUT (src/features/auth-rut)
```ts
// 1. Garantizar sesión (anónima) — requiere Anonymous sign-ins habilitado.
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
// 2. Vincular sesión ↔ perfil por RUT (valida DV server-side).
const rut = rutSchema.parse(rawInput); // src/lib/rut.ts
const { data: profile, error } = await supabase.rpc("login_with_rut", { p_rut: rut });
```
Errores esperables: `INVALID_RUT` (mostrar "RUT inválido") y `AUTH_REQUIRED`
(reintentar signInAnonymously). RLS aísla todo por `current_profile_id()`.

## Hooks react-query (src/features/*/)
`queryKeys` tipados por feature, con `as const`:
```ts
export const progressKeys = {
  all: ["progress"] as const,
  map: (profileId: string) => [...progressKeys.all, "map", profileId] as const,
  bySpecialty: (profileId: string) => [...progressKeys.all, "specialty", profileId] as const,
};
```
Lecturas de agregados: vistas `v_item_progress_pct` / `v_specialty_progress` /
`v_area_progress` (ya aplican RLS y la fórmula). Contenido: `staleTime` largo (no cambia).

## Optimistic update (patrón completo — clave para la ProgressBar instantánea)
La caché del mapa de progreso es `Record<number, ItemProgressRow>` (item_id → fila).
Al togglear una dimensión, la UI se actualiza al instante y se revierte si falla:
```ts
type Dimension = "studied" | "review1" | "review2" | "questions_done" | "cases_done";
type ProgressMap = Record<number, ItemProgressRow>;

export function useToggleDimension(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { itemId: number; dim: Dimension; value: boolean }) => {
      const { error } = await supabase.from("item_progress").upsert(
        { profile_id: profileId, item_id: v.itemId, [v.dim]: v.value },
        { onConflict: "profile_id,item_id" },
      );
      if (error) throw error;
    },
    onMutate: async ({ itemId, dim, value }) => {
      await qc.cancelQueries({ queryKey: progressKeys.map(profileId) });
      const previous = qc.getQueryData<ProgressMap>(progressKeys.map(profileId));
      qc.setQueryData<ProgressMap>(progressKeys.map(profileId), (old = {}) => ({
        ...old,
        [itemId]: { ...emptyProgressRow(profileId, itemId), ...old[itemId], [dim]: value },
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(progressKeys.map(profileId), ctx.previous);
      toast.error("No se pudo guardar el cambio. Reintenta.");
    },
    onSettled: () => {
      // Reconciliar con el servidor (también refresca los agregados de las vistas).
      qc.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}
```
El pct derivado se calcula en el cliente con `itemPct()` de `src/features/progress`
(ver skill `progress-model`) — así la barra se llena sin esperar al servidor.

## Checklist
- [ ] Mutación con onMutate/onError/onSettled (nunca "fire and forget").
- [ ] queryKey desde el objeto `*Keys`, jamás strings sueltos.
- [ ] Error → toast en español + rollback.
- [ ] `pnpm db:types` si el esquema cambió; `pnpm typecheck` al final.
