/**
 * Tipos de la base de datos Supabase.
 * ESCRITOS A MANO como arranque — regenerar con `pnpm db:types` cuando el
 * proyecto Supabase esté vinculado (supabase link). Mantener en sync con
 * supabase/migrations/.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ItemTypeEnum = "tema" | "examen_complementario";

export interface Database {
  public: {
    Tables: {
      areas: {
        Row: { id: number; name: string; sort_order: number };
        Insert: { id?: number; name: string; sort_order?: number };
        Update: { id?: number; name?: string; sort_order?: number };
        Relationships: [];
      };
      specialties: {
        Row: { id: number; area_id: number; name: string; sort_order: number };
        Insert: { id?: number; area_id: number; name: string; sort_order?: number };
        Update: { id?: number; area_id?: number; name?: string; sort_order?: number };
        Relationships: [];
      };
      items: {
        Row: {
          id: number;
          specialty_id: number;
          title: string;
          item_type: ItemTypeEnum;
          sort_order: number;
          priority: number | null;
        };
        Insert: {
          id?: number;
          specialty_id: number;
          title: string;
          item_type?: ItemTypeEnum;
          sort_order?: number;
          priority?: number | null;
        };
        Update: Partial<{
          id: number;
          specialty_id: number;
          title: string;
          item_type: ItemTypeEnum;
          sort_order: number;
          priority: number | null;
        }>;
        Relationships: [];
      };
      item_requirements: {
        Row: {
          item_id: number;
          fisiopatologia: boolean;
          conocimiento_general: boolean;
          dx_sospecha: boolean;
          dx_especifico: boolean;
          tto_inicial: boolean;
          tto_completo: boolean;
          estudio_complicaciones: boolean;
          seguimiento_derivar: boolean;
          seguimiento_cronico: boolean;
        };
        Insert: { item_id: number } & Partial<
          Omit<Database["public"]["Tables"]["item_requirements"]["Row"], "item_id">
        >;
        Update: Partial<Database["public"]["Tables"]["item_requirements"]["Row"]>;
        Relationships: [];
      };
      eunacom_codes: {
        Row: {
          code: string;
          official_title: string;
          area: string;
          specialty: string;
          section: string | null;
          dx_level: string | null;
          tto_level: string | null;
          followup_level: string | null;
          extra_level: string | null;
        };
        Insert: Database["public"]["Tables"]["eunacom_codes"]["Row"];
        Update: Partial<Database["public"]["Tables"]["eunacom_codes"]["Row"]>;
        Relationships: [];
      };
      item_eunacom_map: {
        Row: { item_id: number; eunacom_code: string; confidence: string };
        Insert: { item_id: number; eunacom_code: string; confidence?: string };
        Update: Partial<{ item_id: number; eunacom_code: string; confidence: string }>;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; rut: string; created_at: string; settings: Json };
        Insert: { id?: string; rut: string; created_at?: string; settings?: Json };
        Update: Partial<{ id: string; rut: string; created_at: string; settings: Json }>;
        Relationships: [];
      };
      profile_auth_links: {
        Row: { auth_user_id: string; profile_id: string; created_at: string };
        Insert: { auth_user_id: string; profile_id: string; created_at?: string };
        Update: Partial<{ auth_user_id: string; profile_id: string }>;
        Relationships: [];
      };
      item_progress: {
        Row: {
          profile_id: string;
          item_id: number;
          studied: boolean;
          review1: boolean;
          review2: boolean;
          questions_done: boolean;
          cases_done: boolean;
          mastery: number | null;
          last_studied_at: string | null;
          next_review_at: string | null;
          notes: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          item_id: number;
          studied?: boolean;
          review1?: boolean;
          review2?: boolean;
          questions_done?: boolean;
          cases_done?: boolean;
          mastery?: number | null;
          last_studied_at?: string | null;
          next_review_at?: string | null;
          notes?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["item_progress"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      v_item_progress_pct: {
        Row: { item_id: number; specialty_id: number; pct: number };
        Relationships: [];
      };
      v_specialty_progress: {
        Row: {
          specialty_id: number;
          area_id: number;
          name: string;
          items_total: number;
          items_done: number;
          pct: number;
        };
        Relationships: [];
      };
      v_area_progress: {
        Row: {
          area_id: number;
          name: string;
          items_total: number;
          items_done: number;
          pct: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      login_with_rut: {
        Args: { p_rut: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      is_valid_rut: {
        Args: { p_rut: string };
        Returns: boolean;
      };
      current_profile_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      item_type: ItemTypeEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
