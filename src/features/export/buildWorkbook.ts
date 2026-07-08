import type ExcelJS from "exceljs";
import type { ContentTree } from "@/features/content/useContent";
import {
  aggregate,
  itemPct,
  DIM_LABELS,
  PROGRESS_DIMS,
  type ProgressMap,
} from "@/features/progress/model";
import { MASTERY_LABELS, REQUIREMENT_LABELS } from "@/types/domain";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F766E" },
};
const ITEM_TYPE_LABELS: Record<string, string> = {
  tema: "Tema",
  examen_complementario: "Examen complementario",
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
}

/** Convierte una fecha "YYYY-MM-DD" a Date local (evita corrimiento por UTC). */
function parseDateOnly(iso: string | null): Date | null {
  if (!iso) return null;
  const parts = iso.split("-").map(Number);
  const [y, m, d] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return new Date(y, m - 1, d);
}

function buildResumenSheet(
  workbook: ExcelJS.Workbook,
  content: ContentTree,
  progress: ProgressMap,
) {
  const sheet = workbook.addWorksheet("Resumen");
  sheet.columns = [
    { header: "", key: "label", width: 32 },
    { header: "", key: "value", width: 16 },
  ];

  const global = aggregate(content.items, progress);
  const masteries = content.items
    .map((i) => progress.get(i.id)?.mastery)
    .filter((m): m is number => typeof m === "number");
  const avgMastery =
    masteries.length > 0
      ? masteries.reduce((a, b) => a + b, 0) / masteries.length
      : null;
  const pendingReviews = content.items.filter((i) => {
    const p = progress.get(i.id);
    return p?.next_review_at && itemPct(p) < 100;
  }).length;

  const addSectionTitle = (title: string) => {
    sheet.addRow([]);
    const row = sheet.addRow([title]);
    row.font = { bold: true };
  };

  addSectionTitle("KPIs globales");
  sheet.addRow(["Avance global", global.pct / 100]).getCell(2).numFmt = "0.0%";
  sheet.addRow(["Completados", global.itemsDone]);
  sheet.addRow(["En progreso", global.itemsInProgress]);
  sheet.addRow([
    "No iniciados",
    global.itemsTotal - global.itemsDone - global.itemsInProgress,
  ]);
  sheet.addRow(["Dominio promedio", avgMastery !== null ? avgMastery : "—"]);
  sheet.addRow(["Repasos pendientes", pendingReviews]);

  addSectionTitle("Avance por dimensión");
  for (const dim of PROGRESS_DIMS) {
    const pctDim =
      content.items.length === 0
        ? 0
        : content.items.filter((i) => progress.get(i.id)?.[dim]).length /
          content.items.length;
    sheet.addRow([DIM_LABELS[dim], pctDim]).getCell(2).numFmt = "0.0%";
  }

  addSectionTitle("Avance por área");
  for (const area of content.areas) {
    const areaItems = content.specialties
      .filter((s) => s.area_id === area.id)
      .flatMap((s) => s.items);
    const agg = aggregate(areaItems, progress);
    sheet.addRow([area.name, agg.pct / 100]).getCell(2).numFmt = "0.0%";
  }

  addSectionTitle("Avance por especialidad");
  for (const specialty of content.specialties) {
    if (specialty.items.length === 0) continue;
    const agg = aggregate(specialty.items, progress);
    sheet.addRow([specialty.name, agg.pct / 100]).getCell(2).numFmt = "0.0%";
  }

  addSectionTitle("Distribución de dominio");
  for (const level of [1, 2, 3, 4, 5]) {
    const count = content.items.filter(
      (i) => progress.get(i.id)?.mastery === level,
    ).length;
    sheet.addRow([MASTERY_LABELS[level], count]);
  }
}

function buildItemsSheet(
  workbook: ExcelJS.Workbook,
  content: ContentTree,
  progress: ProgressMap,
) {
  const sheet = workbook.addWorksheet("Ítems");
  sheet.columns = [
    { header: "Área", key: "area", width: 18 },
    { header: "Especialidad", key: "especialidad", width: 26 },
    { header: "Ítem", key: "item", width: 40 },
    { header: "Tipo", key: "tipo", width: 16 },
    ...PROGRESS_DIMS.map((dim) => ({
      header: DIM_LABELS[dim],
      key: dim,
      width: 9,
    })),
    { header: "% Avance", key: "pct", width: 10 },
    { header: "Dominio", key: "dominio", width: 18 },
    { header: "Último estudio", key: "ultimoEstudio", width: 14 },
    { header: "Próximo repaso", key: "proximoRepaso", width: 14 },
    { header: "Notas", key: "notas", width: 30 },
    { header: "Códigos EUNACOM", key: "codigos", width: 22 },
    { header: "Exigencias", key: "exigencias", width: 40 },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const item of content.items) {
    const specialty = content.specialtyById.get(item.specialty_id);
    const area = specialty ? content.areaById.get(specialty.area_id) : undefined;
    const p = progress.get(item.id);

    const row: Record<string, unknown> = {
      area: area?.name ?? "—",
      especialidad: specialty?.name ?? "—",
      item: item.title,
      tipo: ITEM_TYPE_LABELS[item.item_type] ?? item.item_type,
      pct: itemPct(p) / 100,
      dominio: p?.mastery != null ? MASTERY_LABELS[p.mastery] : "—",
      ultimoEstudio: parseDateOnly(p?.last_studied_at ?? null),
      proximoRepaso: parseDateOnly(p?.next_review_at ?? null),
      notas: p?.notes ?? "",
      codigos: item.eunacom_codes.join(", "),
      exigencias: item.requirements.map((k) => REQUIREMENT_LABELS[k]).join(", "),
    };
    for (const dim of PROGRESS_DIMS) row[dim] = p?.[dim] ? "✓" : "—";

    const addedRow = sheet.addRow(row);
    addedRow.getCell("pct").numFmt = "0.0%";
    if (row.ultimoEstudio) addedRow.getCell("ultimoEstudio").numFmt = "dd-mm-yyyy";
    if (row.proximoRepaso) addedRow.getCell("proximoRepaso").numFmt = "dd-mm-yyyy";
  }
}

export async function buildWorkbook(content: ContentTree, progress: ProgressMap) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "EunaTrack";
  workbook.created = new Date();

  buildResumenSheet(workbook, content, progress);
  buildItemsSheet(workbook, content, progress);

  return workbook.xlsx.writeBuffer();
}
