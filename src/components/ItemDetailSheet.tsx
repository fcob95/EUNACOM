"use client";

/**
 * <ItemDetailSheet> — edición de un ítem: bottom sheet (móvil) / dialog
 * (desktop). Autosave con optimistic update: la barra se llena en vivo.
 */
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, ProgressLabel } from "@/components/ProgressBar";
import { DomainSelector } from "@/components/DomainSelector";
import { MatrixChips } from "@/components/MatrixChips";
import type { Item, ItemProgress } from "@/types/domain";
import {
  DIM_LABELS,
  PROGRESS_DIMS,
  dimsDone,
  itemPct,
  type ProgressDim,
} from "@/features/progress/model";
import {
  useUpdateProgress,
  type ProgressPatch,
} from "@/features/progress/useProgress";
import { todayISO } from "@/lib/utils";
import { nextReviewPatch } from "@/features/planner/model";
import { useEffect, useState } from "react";

interface ItemDetailSheetProps {
  item: Item | null;
  progress: ItemProgress | undefined;
  specialtyName: string;
  onClose: () => void;
}

export function ItemDetailSheet({
  item,
  progress,
  specialtyName,
  onClose,
}: ItemDetailSheetProps) {
  const update = useUpdateProgress();
  const [notes, setNotes] = useState(progress?.notes ?? "");

  useEffect(() => {
    setNotes(progress?.notes ?? "");
    // Solo re-sincronizar al cambiar de ítem (no en cada keystroke remoto).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  const pct = itemPct(progress);
  const save = (patch: ProgressPatch) =>
    update.mutate({ itemId: item.id, patch });

  const toggleDim = (dim: ProgressDim, value: boolean) => {
    const patch: ProgressPatch = { [dim]: value };
    // Repaso espaciado automático (planner/model.ts):
    if (value) {
      patch.last_studied_at = todayISO();
      Object.assign(patch, nextReviewPatch(dim, progress));
    }
    save(patch);
  };

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title={item.title} description={specialtyName}>
        <div className="flex flex-col gap-5 pt-2">
          {/* barra en vivo */}
          <div className="flex items-center gap-3">
            <ProgressBar value={pct} variant="thick" className="flex-1" />
            <ProgressLabel done={dimsDone(progress)} total={5} pct={pct} />
          </div>

          {/* 5 dimensiones de seguimiento */}
          <section className="flex flex-col gap-1" aria-label="Seguimiento">
            {PROGRESS_DIMS.map((dim) => (
              <label
                key={dim}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-1.5 py-1 hover:bg-surface-2"
              >
                <span className="text-[15px] font-semibold">{DIM_LABELS[dim]}</span>
                <Switch
                  checked={progress?.[dim] ?? false}
                  onCheckedChange={(v) => toggleDim(dim, v)}
                  aria-label={DIM_LABELS[dim]}
                />
              </label>
            ))}
          </section>

          {/* dominio 1–5 */}
          <section aria-label="Dominio">
            <Label className="mb-2 block">Dominio (1–5)</Label>
            <DomainSelector
              value={progress?.mastery ?? null}
              onChange={(v) => save({ mastery: v })}
            />
          </section>

          {/* fechas */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="last-studied" className="mb-1.5 block">
                Último estudio
              </Label>
              <Input
                id="last-studied"
                type="date"
                value={progress?.last_studied_at ?? ""}
                onChange={(e) =>
                  save({ last_studied_at: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label htmlFor="next-review" className="mb-1.5 block">
                Próximo repaso
              </Label>
              <Input
                id="next-review"
                type="date"
                value={progress?.next_review_at ?? ""}
                onChange={(e) =>
                  save({ next_review_at: e.target.value || null })
                }
              />
            </div>
          </section>

          {/* observaciones (guarda al salir del campo) */}
          <section>
            <Label htmlFor="notes" className="mb-1.5 block">
              Observaciones
            </Label>
            <Textarea
              id="notes"
              placeholder="Notas, perlas, fuentes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (progress?.notes ?? "")) save({ notes });
              }}
            />
          </section>

          {/* matriz completa + códigos EUNACOM */}
          {item.requirements.length > 0 && (
            <section>
              <Label className="mb-2 block">Exigencia del internado</Label>
              <MatrixChips active={item.requirements} mode="full" />
            </section>
          )}
          {item.eunacom_codes.length > 0 && (
            <section>
              <Label className="mb-2 block">Códigos EUNACOM</Label>
              <ul className="flex flex-wrap gap-1.5">
                {item.eunacom_codes.map((code) => (
                  <li key={code}>
                    <Badge className="font-mono text-[11.5px]">{code}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
