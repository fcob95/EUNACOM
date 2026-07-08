"use client";

/**
 * Dashboard: anillo global (172px) + KPIs + avance por especialidad
 * (Recharts, barras horizontales) + distribución de dominio con los colores
 * de la escala. El área prioritaria (menor sort_order) se destaca.
 */
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";
import { KpiCard } from "@/components/KpiCard";
import { ProgressBar } from "@/components/ProgressBar";
import { useContent } from "@/features/content/useContent";
import { useProgressMap } from "@/features/progress/useProgress";
import {
  aggregate,
  itemPct,
  type ProgressMap,
} from "@/features/progress/model";
import { DIM_LABELS, PROGRESS_DIMS } from "@/features/progress/model";

const DOMAIN_COLORS = [
  "var(--domain-1)",
  "var(--domain-2)",
  "var(--domain-3)",
  "var(--domain-4)",
  "var(--domain-5)",
];

export default function DashboardPage() {
  const content = useContent();
  const progress = useProgressMap();

  const progressMap: ProgressMap = useMemo(
    () => progress.data ?? new Map(),
    [progress.data],
  );

  const stats = useMemo(() => {
    if (!content.data) return null;
    const items = content.data.items;
    const global = aggregate(items, progressMap);

    const bySpecialty = content.data.specialties
      .filter((s) => s.items.length > 0)
      .map((s) => ({
        name: s.name,
        pct: aggregate(s.items, progressMap).pct,
      }));

    const domainDist = [1, 2, 3, 4, 5].map((level) => ({
      level: String(level),
      count: items.filter((i) => progressMap.get(i.id)?.mastery === level).length,
    }));

    const byDim = PROGRESS_DIMS.map((dim) => ({
      dim,
      label: DIM_LABELS[dim],
      pct:
        items.length === 0
          ? 0
          : Math.round(
              (items.filter((i) => progressMap.get(i.id)?.[dim]).length /
                items.length) *
                100,
            ),
    }));

    const masteries = items
      .map((i) => progressMap.get(i.id)?.mastery)
      .filter((m): m is number => typeof m === "number");
    const avgMastery =
      masteries.length > 0
        ? (masteries.reduce((a, b) => a + b, 0) / masteries.length).toFixed(1)
        : "—";

    const pendingReviews = items.filter((i) => {
      const p = progressMap.get(i.id);
      return p?.next_review_at && itemPct(p) < 100;
    }).length;

    const areas = content.data.areas.map((a) => {
      const specs = content.data!.specialties.filter((s) => s.area_id === a.id);
      const areaItems = specs.flatMap((s) => s.items);
      return { area: a, agg: aggregate(areaItems, progressMap) };
    });

    return { global, bySpecialty, domainDist, byDim, avgMastery, pendingReviews, areas };
  }, [content.data, progressMap]);

  if (content.isLoading || progress.isLoading || !stats) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-56 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (content.isError || progress.isError) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <p className="font-semibold">No se pudo cargar el dashboard.</p>
        <Button className="mt-4" onClick={() => void content.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { global } = stats;
  const specialtyChartHeight = Math.max(220, stats.bySpecialty.length * 36);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>

      {/* anillo global + avance por tipo de actividad */}
      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
        <div className="flex justify-center">
          <ProgressRing value={global.pct} size={172} strokeWidth={14}>
            <span className="text-center">
              <span className="block text-4xl font-extrabold tracking-tight tabular-nums">
                {Math.round(global.pct)}%
              </span>
              <span className="text-[12px] font-semibold text-muted">
                avance global
              </span>
            </span>
          </ProgressRing>
        </div>
        <div className="flex flex-col gap-2.5">
          {stats.byDim.map((d) => (
            <div key={d.dim} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[12px] font-semibold text-muted">
                {d.label}
              </span>
              <ProgressBar value={d.pct} variant="thin" className="flex-1" label={`${d.label}: ${d.pct}%`} />
              <span className="w-10 text-right text-[12px] font-semibold tabular-nums text-muted">
                {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard value={String(global.itemsDone)} label="Completados" />
        <KpiCard value={String(global.itemsInProgress)} label="En progreso" />
        <KpiCard
          value={String(global.itemsTotal - global.itemsDone - global.itemsInProgress)}
          label="No iniciados"
        />
        <KpiCard value={stats.avgMastery} label="Dominio promedio" />
        <KpiCard
          value={String(stats.pendingReviews)}
          label="Repasos pendientes"
          className="col-span-2 sm:col-span-1"
        />
      </section>

      {/* avance por área (destaca la prioritaria = primera) */}
      {stats.areas.length > 1 && (
        <section className="flex flex-col gap-2">
          {stats.areas.map(({ area, agg }) => (
            <div
              key={area.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card"
            >
              <span className="w-40 truncate text-sm font-extrabold">{area.name}</span>
              <ProgressBar value={agg.pct} variant="thick" className="flex-1" />
              <span className="text-[12px] font-semibold tabular-nums text-muted">
                {Math.round(agg.pct)}%
              </span>
            </div>
          ))}
        </section>
      )}

      {/* avance por especialidad */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="text-base font-extrabold">Avance por especialidad</h2>
        {stats.bySpecialty.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface-2 px-4 py-8 text-center text-[13px] font-semibold text-muted">
            Aún no hay contenido cargado.
          </p>
        ) : (
          <div className="mt-3" style={{ height: specialtyChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.bySpecialty}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 12, fontWeight: 600 }}
                />
                <Bar dataKey="pct" radius={[6, 6, 6, 6]} barSize={14} fill="var(--primary)">
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(v: number) => `${Math.round(v)}%`}
                    style={{ fill: "var(--muted)", fontSize: 11.5, fontWeight: 700 }}
                  />
                  {stats.bySpecialty.map((row) => (
                    <Cell
                      key={row.name}
                      fill={row.pct >= 100 ? "var(--done)" : "var(--primary)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* distribución de dominio */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="text-base font-extrabold">Distribución de dominio</h2>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.domainDist} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
              <XAxis
                dataKey="level"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 12, fontWeight: 700 }}
              />
              <YAxis hide />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fill: "var(--muted)", fontSize: 11.5, fontWeight: 700 }}
                />
                {stats.domainDist.map((row, idx) => (
                  <Cell key={row.level} fill={DOMAIN_COLORS[idx]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[11.5px] font-semibold text-faint">
          1 = No lo conozco · 5 = Lo manejo muy bien
        </p>
      </section>
    </div>
  );
}
