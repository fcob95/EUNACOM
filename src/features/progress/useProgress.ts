"use client";

/**
 * Progreso del perfil actual + mutación con OPTIMISTIC UPDATE.
 * El patrón onMutate/onError/onSettled hace que la barra se llene al
 * instante al marcar avance (ver .claude/skills/supabase-patterns).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { useProfile } from "@/features/auth-rut/ProfileProvider";
import type { ItemProgress } from "@/types/domain";
import { emptyProgress, type ProgressMap } from "./model";

export const progressKeys = {
  byProfile: (profileId: string) => ["progress", profileId] as const,
};

async function fetchProgress(): Promise<ProgressMap> {
  const { data, error } = await getSupabase().from("item_progress").select("*");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.item_id, row]));
}

export function useProgressMap() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: progressKeys.byProfile(profile?.id ?? "anon"),
    queryFn: fetchProgress,
    enabled: Boolean(profile),
    staleTime: 1000 * 30,
  });
}

export type ProgressPatch = Partial<
  Omit<ItemProgress, "profile_id" | "item_id" | "updated_at">
>;

export function useUpdateProgress() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const key = progressKeys.byProfile(profile?.id ?? "anon");

  return useMutation({
    mutationFn: async (vars: { itemId: number; patch: ProgressPatch }) => {
      if (!profile) throw new Error("Sin sesión");
      // Solo las columnas que cambiaron: en conflicto, Postgres actualiza
      // únicamente estas — evita pisar otras dimensiones si dos toggles
      // se disparan antes de que la primera vuelva de Supabase.
      const { error } = await getSupabase()
        .from("item_progress")
        .upsert(
          { profile_id: profile.id, item_id: vars.itemId, ...vars.patch },
          { onConflict: "profile_id,item_id" },
        );
      if (error) throw new Error(error.message);
    },
    onMutate: async (vars) => {
      if (!profile) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProgressMap>(key);
      queryClient.setQueryData<ProgressMap>(key, (old) => {
        const next = new Map(old ?? []);
        const base =
          next.get(vars.itemId) ?? emptyProgress(profile.id, vars.itemId);
        next.set(vars.itemId, {
          ...base,
          ...vars.patch,
          updated_at: new Date().toISOString(),
        });
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error("No se pudo guardar. Reintenta.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
