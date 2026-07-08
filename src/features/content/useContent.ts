"use client";

/**
 * Contenido compartido (temario): areas → specialties → items (+matriz,
 * +códigos EUNACOM). Cambia solo con seeds → staleTime largo.
 */
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import type {
  Area,
  Item,
  RequirementKey,
  SpecialtyWithItems,
} from "@/types/domain";
import { REQUIREMENT_KEYS } from "@/types/domain";

export const contentKeys = {
  all: ["content"] as const,
};

export interface ContentTree {
  areas: Area[];
  /** Especialidades (con ítems) ordenadas, de todas las áreas. */
  specialties: SpecialtyWithItems[];
  /** Todos los ítems, en orden de área → especialidad → ítem. */
  items: Item[];
  itemById: Map<number, Item>;
  specialtyById: Map<number, SpecialtyWithItems>;
  areaById: Map<number, Area>;
}

async function fetchContent(): Promise<ContentTree> {
  const supabase = getSupabase();
  const [areasRes, specsRes, itemsRes, reqsRes, mapRes] = await Promise.all([
    supabase.from("areas").select("*").order("sort_order"),
    supabase.from("specialties").select("*").order("sort_order"),
    supabase.from("items").select("*").order("sort_order"),
    supabase.from("item_requirements").select("*"),
    supabase.from("item_eunacom_map").select("*"),
  ]);
  const firstError =
    areasRes.error ?? specsRes.error ?? itemsRes.error ?? reqsRes.error ?? mapRes.error;
  if (firstError) throw new Error(firstError.message);

  const reqsByItem = new Map<number, RequirementKey[]>();
  for (const row of reqsRes.data ?? []) {
    reqsByItem.set(
      row.item_id,
      REQUIREMENT_KEYS.filter((k) => row[k]),
    );
  }
  const codesByItem = new Map<number, string[]>();
  for (const row of mapRes.data ?? []) {
    const list = codesByItem.get(row.item_id) ?? [];
    list.push(row.eunacom_code);
    codesByItem.set(row.item_id, list);
  }

  const areas = areasRes.data ?? [];
  const areaOrder = new Map(areas.map((a) => [a.id, a.sort_order]));

  const specialties: SpecialtyWithItems[] = (specsRes.data ?? [])
    .map((s) => ({ ...s, items: [] as Item[] }))
    .sort(
      (a, b) =>
        (areaOrder.get(a.area_id) ?? 0) - (areaOrder.get(b.area_id) ?? 0) ||
        a.sort_order - b.sort_order,
    );
  const specialtyById = new Map(specialties.map((s) => [s.id, s]));

  const items: Item[] = [];
  for (const row of itemsRes.data ?? []) {
    const item: Item = {
      ...row,
      requirements: reqsByItem.get(row.id) ?? [],
      eunacom_codes: (codesByItem.get(row.id) ?? []).sort(),
    };
    specialtyById.get(row.specialty_id)?.items.push(item);
  }
  for (const s of specialties) {
    s.items.sort((a, b) => a.sort_order - b.sort_order);
    items.push(...s.items);
  }

  return {
    areas,
    specialties,
    items,
    itemById: new Map(items.map((i) => [i.id, i])),
    specialtyById,
    areaById: new Map(areas.map((a) => [a.id, a])),
  };
}

export function useContent() {
  return useQuery({
    queryKey: contentKeys.all,
    queryFn: fetchContent,
    staleTime: 1000 * 60 * 30,
  });
}
