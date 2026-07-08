"use client";

/**
 * Identidad por RUT (sin contraseña):
 * 1. El dispositivo abre una sesión ANÓNIMA de Supabase (persistida en
 *    localStorage por supabase-js).
 * 2. login(rut) llama al RPC login_with_rut → upsert del profile + vínculo
 *    auth.uid() ↔ profile. RLS aísla los datos vía current_profile_id().
 * 3. Varias sesiones anónimas (teléfono/tablet/PC) apuntan al mismo profile
 *    → sincronización entre dispositivos.
 * Limitación conocida (ver README): cualquiera con un RUT válido accede a
 * ese perfil.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { normalizeRut, rutSchema } from "@/lib/rut";
import type { Profile } from "@/types/domain";

const STORAGE_KEY = "eunatrack:profile";

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  login: (rawRut: string) => Promise<Profile>;
  logout: () => Promise<void>;
  updateSettings: (settings: Profile["settings"]) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Rehidratar: perfil cacheado + verificar que la sesión anónima siga viva.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const cached = readCachedProfile();
      if (!cached) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await getSupabase().auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setProfile(cached);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Supabase sin configurar u offline: no bloquear la app.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (rawRut: string): Promise<Profile> => {
      const parsed = rutSchema.parse(rawRut); // lanza ZodError si es inválido
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("[EunaTrack] signInAnonymously failed:", error);
          throw new Error(
            `No se pudo iniciar sesión (${error.status ?? "?"}: ${error.message}). Revisa 'Anonymous sign-ins' en Supabase y que NEXT_PUBLIC_SUPABASE_URL/ANON_KEY apunten al proyecto correcto.`,
          );
        }
      }

      const { data, error } = await supabase.rpc("login_with_rut", {
        p_rut: normalizeRut(parsed),
      });
      if (error || !data) {
        console.error("[EunaTrack] login_with_rut failed:", error);
        throw new Error(
          error?.message.includes("INVALID_RUT")
            ? "RUT inválido. Revisa el dígito verificador."
            : `No se pudo ingresar${error ? ` (${error.message})` : ""}. Intenta de nuevo.`,
        );
      }
      const prof = data as Profile;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prof));
      setProfile(prof);
      queryClient.clear(); // sin datos de un perfil anterior
      return prof;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } finally {
      window.localStorage.removeItem(STORAGE_KEY);
      setProfile(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const updateSettings = useCallback(
    async (settings: Profile["settings"]) => {
      if (!profile) return;
      const next = { ...profile, settings };
      setProfile(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      const { error } = await getSupabase()
        .from("profiles")
        .update({ settings })
        .eq("id", profile.id);
      if (error) throw new Error("No se pudieron guardar los ajustes.");
    },
    [profile],
  );

  const value = useMemo(
    () => ({ profile, loading, login, logout, updateSettings }),
    [profile, loading, login, logout, updateSettings],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx)
    throw new Error("useProfile debe usarse dentro de <ProfileProvider>");
  return ctx;
}
