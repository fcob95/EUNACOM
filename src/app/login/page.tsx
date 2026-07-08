"use client";

/**
 * Login por RUT (sin contraseña). Valida DV en cliente (Zod), abre sesión
 * anónima de Supabase y llama al RPC login_with_rut.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogIn } from "lucide-react";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { RutInput } from "@/components/RutInput";
import { useProfile } from "@/features/auth-rut/ProfileProvider";
import { isSupabaseConfigured } from "@/lib/supabase";
import { rutSchema } from "@/lib/rut";

export default function LoginPage() {
  const { login } = useProfile();
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = rutSchema.safeParse(rut);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "RUT inválido");
      return;
    }
    setSubmitting(true);
    try {
      await login(rut);
      router.replace("/panel");
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0]?.message ?? "RUT inválido");
      } else {
        setError(err instanceof Error ? err.message : "No se pudo ingresar.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary shadow-card">
            <Activity className="size-7 text-white" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">EunaTrack</h1>
            <p className="mt-1 text-[14px] text-muted">
              Tu preparación EUNACOM, bajo control.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-5 shadow-card"
        >
          <RutInput
            value={rut}
            onChange={(v) => {
              setRut(v);
              if (error) setError(null);
            }}
            error={error}
            disabled={submitting || !configured}
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || !configured}
          >
            <LogIn className="size-5" aria-hidden />
            {submitting ? "Ingresando…" : "Ingresar"}
          </Button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
            Solo tu RUT — sin contraseña. Tu avance se sincroniza entre
            dispositivos.
          </p>
        </form>

        {!configured && (
          <p className="mt-4 rounded-xl border border-in-progress/50 bg-surface px-4 py-3 text-[13px] text-muted">
            ⚠️ Falta configurar Supabase: copia <code>.env.example</code> a{" "}
            <code>.env.local</code> y completa las credenciales (ver README).
          </p>
        )}
      </div>
    </main>
  );
}
