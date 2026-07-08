"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/features/pwa/useInstallPrompt";

export function InstallAppButton() {
  const { ready, canInstall, isIOS, isStandalone, promptInstall } =
    useInstallPrompt();

  if (!ready || isStandalone) return null;

  if (canInstall) {
    return (
      <Button className="w-full" onClick={() => void promptInstall()}>
        <Download className="size-5" aria-hidden />
        Instalar app
      </Button>
    );
  }

  if (isIOS) {
    return (
      <Button
        className="w-full"
        onClick={() =>
          toast.info("Abre el menú Compartir → Agregar a pantalla de inicio", {
            duration: 6000,
          })
        }
      >
        <Download className="size-5" aria-hidden />
        Instalar app
      </Button>
    );
  }

  return (
    <div>
      <Button className="w-full" disabled>
        <Download className="size-5" aria-hidden />
        Instalar app
      </Button>
      <p className="mt-2 text-center text-[12px] text-faint">
        Instalación no disponible en este navegador.
      </p>
    </div>
  );
}
