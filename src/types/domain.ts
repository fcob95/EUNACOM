import type { Database, Json } from "./supabase";

export type Area = Database["public"]["Tables"]["areas"]["Row"];
export type Specialty = Database["public"]["Tables"]["specialties"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type ItemRow = Database["public"]["Tables"]["items"]["Row"];
export type ItemRequirements =
  Database["public"]["Tables"]["item_requirements"]["Row"];
export type EunacomCode = Database["public"]["Tables"]["eunacom_codes"]["Row"];
export type ItemProgress =
  Database["public"]["Tables"]["item_progress"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Los 9 ejes de la matriz de exigencia del internado. */
export const REQUIREMENT_KEYS = [
  "fisiopatologia",
  "conocimiento_general",
  "dx_sospecha",
  "dx_especifico",
  "tto_inicial",
  "tto_completo",
  "estudio_complicaciones",
  "seguimiento_derivar",
  "seguimiento_cronico",
] as const;
export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

export const REQUIREMENT_LABELS: Record<RequirementKey, string> = {
  fisiopatologia: "Fisiopatología",
  conocimiento_general: "Conocimiento general",
  dx_sospecha: "Dx sospecha",
  dx_especifico: "Dx específico",
  tto_inicial: "Tto inicial",
  tto_completo: "Tto completo",
  estudio_complicaciones: "Complicaciones",
  seguimiento_derivar: "Seguimiento: derivar",
  seguimiento_cronico: "Seguimiento crónico",
};

/** Ítem enriquecido para la UI: fila + matriz + códigos EUNACOM. */
export interface Item extends ItemRow {
  requirements: RequirementKey[];
  eunacom_codes: string[];
}

/** Tema (subcapítulo) con sus ítems. */
export interface TopicWithItems extends Topic {
  items: Item[];
}

/**
 * Especialidad con sus temas, para el panel maestro. Mantiene además
 * `items` plano (todos los ítems de la especialidad, sin agrupar) para los
 * consumidores que no necesitan la jerarquía de temas (Dashboard, export,
 * planificador) — mismo patrón que ContentTree.items vs. specialties.
 */
export interface SpecialtyWithTopics extends Specialty {
  topics: TopicWithItems[];
  items: Item[];
}

export interface ProfileSettings {
  items_per_day: number;
  theme?: string;
}

export const DEFAULT_SETTINGS: ProfileSettings = { items_per_day: 5 };

export function parseSettings(json: Json): ProfileSettings {
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {
    const ipd = json["items_per_day"];
    return {
      items_per_day:
        typeof ipd === "number" && ipd >= 1 && ipd <= 30
          ? ipd
          : DEFAULT_SETTINGS.items_per_day,
    };
  }
  return DEFAULT_SETTINGS;
}

/** Etiquetas de la escala de dominio 1–5 (Guía de Estilo §1). */
export const MASTERY_LABELS: Record<number, string> = {
  1: "No lo conozco",
  2: "Muy básico",
  3: "Aceptable",
  4: "Bueno",
  5: "Lo manejo muy bien",
};
