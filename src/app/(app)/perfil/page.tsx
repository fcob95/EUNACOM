"use client";

/**
 * Perfil: RUT, tema claro/oscuro, ítems por día y cerrar sesión.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, Smartphone, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/features/auth-rut/ProfileProvider";
import { formatRut } from "@/lib/rut";
import { cn } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { useContent } from "@/features/content/useContent";
import { useProgressMap } from "@/features/progress/useProgress";

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Smartphone },
] as const;

export default function ProfilePage() {
  const { profile, logout } = useProfile();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const content = useContent();
  const progress = useProgressMap();

  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch {
      toast.error("No se pudo cerrar la sesión.");
      setSigningOut(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Perfil</h1>

      {/* identidad */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <Label className="block">RUT</Label>
        <p className="mt-1 text-xl font-extrabold tracking-wide tabular-nums">
          {profile ? formatRut(profile.rut) : "—"}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-faint">
          Tu avance está asociado a este RUT y se sincroniza entre
          dispositivos. Recuerda: cualquier persona con tu RUT puede acceder a
          este perfil (no hay contraseña).
        </p>
      </section>

      {/* tema */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <Label className="mb-2.5 block">Tema</Label>
        <div
          role="radiogroup"
          aria-label="Tema de la interfaz"
          className="grid grid-cols-3 gap-1.5"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  "pressable flex h-12 items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold",
                  active
                    ? "border-transparent bg-primary-soft text-primary-text"
                    : "border-border bg-surface-2 text-muted",
                )}
              >
                <Icon className="size-4.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* instalar app */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <Label className="mb-2.5 block">Instalar app</Label>
        <InstallAppButton />
      </section>

      {/* exportar */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <Label className="mb-2.5 block">Exportar</Label>
        <ExportExcelButton content={content.data} progressMap={progress.data} />
      </section>

      {/* sesión */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
          disabled={signingOut}
        >
          <LogOut className="size-5" aria-hidden />
          {signingOut ? "Cerrando…" : "Cerrar sesión"}
        </Button>
        <p className="mt-2 text-center text-[12px] text-faint">
          Tu avance queda guardado; al volver a ingresar tu RUT lo recuperas.
        </p>
      </section>
    </div>
  );
}
