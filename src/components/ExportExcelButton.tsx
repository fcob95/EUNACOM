"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ContentTree } from "@/features/content/useContent";
import type { ProgressMap } from "@/features/progress/model";
import { buildWorkbook } from "@/features/export/buildWorkbook";
import { downloadWorkbookBuffer } from "@/features/export/downloadWorkbook";
import { todayISO } from "@/lib/utils";

interface ExportExcelButtonProps {
  content: ContentTree | undefined;
  progressMap: ProgressMap | undefined;
}

export function ExportExcelButton({
  content,
  progressMap,
}: ExportExcelButtonProps) {
  const [exporting, setExporting] = useState(false);
  const ready = Boolean(content && progressMap);

  async function handleExport() {
    if (!content || !progressMap) return;
    setExporting(true);
    try {
      const buffer = await buildWorkbook(content, progressMap);
      downloadWorkbookBuffer(buffer, `EunaTrack_avance_${todayISO()}.xlsx`);
      toast.success("Excel descargado");
    } catch {
      toast.error("No se pudo generar el Excel.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      className="w-full"
      disabled={!ready || exporting}
      onClick={() => void handleExport()}
    >
      <FileSpreadsheet className="size-5" aria-hidden />
      {!ready ? "Cargando datos…" : exporting ? "Generando…" : "Exportar a Excel"}
    </Button>
  );
}
