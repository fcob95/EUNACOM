"use client";

/**
 * Planificador: vista "hoy" (repasos vencidos + ítems nuevos hasta el cupo
 * items_per_day), próximos repasos, y slider de configuración que recalcula
 * el plan al instante. Prioriza el área con sort_order menor (Medicina
 * Interna en el seed) — por datos, no por código.
 */
import { useMemo, useState } from "react";
import { CalendarCheck2, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useContent } from "@/features/content/useContent";
import { useProgressMap, useUpdateProgress } from "@/features/progress/useProgress";
import { useProfile } from "@/features/auth-rut/ProfileProvider";
import {
  computePlan,
  REVIEW_INTERVAL_AFTER_R1,
  REVIEW_INTERVAL_AFTER_STUDY,
  type PlanEntry,
} from "@/features/planner/model";
import { parseSettings } from "@/types/domain";
import type { ProgressMap } from "@/features/progress/model";
import { addDaysISO, formatShortDate, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function PlannerPage() {
  const content = useContent();
  const progress = useProgressMap();
  const update = useUpdateProgress();
  const { profile, updateSettings } = useProfile();

  const settings = parseSettings(profile?.settings ?? null);
  const [itemsPerDay, setItemsPerDay] = useState(settings.items_per_day);
  const today = todayISO();

  const progressMap: ProgressMap = useMemo(
    () => progress.data ?? new Map(),
    [progress.data],
  );

  const plan = useMemo(() => {
    if (!content.data) return null;
    return computePlan(content.data, progressMap, itemsPerDay, today);
  }, [content.data, progressMap, itemsPerDay, today]);

  /** Marcar una entrada del plan como hecha (avanza la dimensión que toca). */
  const completeEntry = (entry: PlanEntry) => {
    const p = progressMap.get(entry.item.id);
    if (entry.kind === "nuevo" || !p?.studied) {
      update.mutate({
        itemId: entry.item.id,
        patch: {
          studied: true,
          last_studied_at: today,
          next_review_at: addDaysISO(today, REVIEW_INTERVAL_AFTER_STUDY),
        },
      });
    } else if (!p.review1) {
      update.mutate({
        itemId: entry.item.id,
        patch: {
          review1: true,
          last_studied_at: today,
          next_review_at: addDaysISO(today, REVIEW_INTERVAL_AFTER_R1),
        },
      });
    } else {
      update.mutate({
        itemId: entry.item.id,
        patch: { review2: true, last_studied_at: today, next_review_at: null },
      });
    }
    toast.success(`${entry.item.title} ✓`);
  };

  const saveItemsPerDay = (value: number) => {
    setItemsPerDay(value);
    void updateSettings({ items_per_day: value }).catch(() =>
      toast.error("No se pudo guardar el ajuste."),
    );
  };

  if (content.isLoading || progress.isLoading || !plan) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-20 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (content.isError || progress.isError) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <p className="font-semibold">No se pudo cargar el planificador.</p>
        <Button className="mt-4" onClick={() => void content.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Planificador</h1>

      {/* configuración */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="items-per-day">Ítems por día</Label>
          <span className="text-lg font-extrabold tabular-nums">{itemsPerDay}</span>
        </div>
        <Slider
          id="items-per-day"
          min={1}
          max={20}
          step={1}
          value={[itemsPerDay]}
          onValueChange={([v]) => setItemsPerDay(v ?? itemsPerDay)}
          onValueCommit={([v]) => saveItemsPerDay(v ?? itemsPerDay)}
          aria-label="Ítems por día"
        />
        <p className="text-[12px] text-faint">
          Los repasos pendientes van primero; el resto del cupo se llena con
          temas nuevos priorizando Medicina Interna.
        </p>
      </section>

      {/* hoy */}
      <section aria-label="Plan de hoy">
        <h2 className="mb-2 text-xs font-extrabold tracking-wider text-faint uppercase">
          Hoy · {plan.today.length} ítems
        </h2>
        {plan.today.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
            <CalendarCheck2 className="mx-auto size-8 text-done" aria-hidden />
            <p className="mt-2 font-semibold">¡Día libre!</p>
            <p className="mt-1 text-[13px] text-muted">
              No hay repasos pendientes ni temas nuevos por hoy.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {plan.today.map((entry) => {
              const overdue =
                entry.kind === "repaso" && (entry.dueDate ?? "") < today;
              return (
                <li
                  key={entry.item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card"
                >
                  <button
                    type="button"
                    onClick={() => completeEntry(entry)}
                    aria-label={`Marcar "${entry.item.title}" como hecho`}
                    className="pressable flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-faint hover:border-primary hover:text-primary"
                  >
                    <Check className="size-5" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{entry.item.title}</p>
                    <p className="text-[12px] text-muted">{entry.specialtyName}</p>
                  </div>
                  <Badge
                    variant={entry.kind === "repaso" ? "primary" : "default"}
                    className={cn(
                      "uppercase tracking-wider",
                      overdue && "bg-domain-1/15 text-domain-1 border-transparent",
                    )}
                  >
                    {entry.kind === "repaso" ? (overdue ? "Atrasado" : "Repaso") : "Nuevo"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* próximos repasos */}
      <section aria-label="Próximos repasos">
        <h2 className="mb-2 text-xs font-extrabold tracking-wider text-faint uppercase">
          Próximos repasos
        </h2>
        {plan.upcoming.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-[13px] font-semibold text-muted shadow-card">
            Sin repasos programados. Marca temas como estudiados y se
            programarán solos.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plan.upcoming.map((entry) => (
              <li
                key={entry.item.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.item.title}</p>
                  <p className="text-[12px] text-muted">{entry.specialtyName}</p>
                </div>
                <span className="shrink-0 text-[12px] font-bold text-primary-text tabular-nums">
                  {formatShortDate(entry.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
