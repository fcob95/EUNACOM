#!/usr/bin/env node
// ============================================================================
// generate-seed.mjs — genera supabase/seed.sql desde content/*.json
//
// Determinista e idempotente:
//   · IDs fijos: area = 1; specialties = sort_order (1-12); items = correlativo
//     global recorriendo especialidades y luego ítems en sort_order.
//   · Todo el contenido usa INSERT ... ON CONFLICT DO UPDATE (re-ejecutable).
//   · eunacom_codes: catálogo COMPLETO (las 7 áreas), deduplicado.
//   · item_eunacom_map: borra los 'suggested' de los ítems presentes y re-inserta;
//     los 'confirmed' hechos a mano se preservan (ON CONFLICT DO NOTHING).
//   · profiles: solo el RUT inicial, sin filas de progreso (se parte de cero).
//   · setval() sincroniza las secuencias identity tras insertar IDs explícitos.
//
// Uso:  node scripts/generate-seed.mjs
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_MI = join(ROOT, 'content', 'medicina-interna.json');
const CONTENT_CODES = join(ROOT, 'content', 'eunacom-codes.json');
const OUT = join(ROOT, 'supabase', 'seed.sql');

// Columnas booleanas de item_requirements (orden fijo del esquema).
const REQ_COLS = [
  'fisiopatologia', 'conocimiento_general', 'dx_sospecha', 'dx_especifico',
  'tto_inicial', 'tto_completo', 'estudio_complicaciones',
  'seguimiento_derivar', 'seguimiento_cronico',
];

const ITEM_TYPES = new Set(['tema', 'examen_complementario']);

// ── Helpers de emisión SQL ──────────────────────────────────────────────────
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 'true' : 'false');

// ── Cargar contenido ────────────────────────────────────────────────────────
const mi = JSON.parse(readFileSync(CONTENT_MI, 'utf8'));
const catalog = JSON.parse(readFileSync(CONTENT_CODES, 'utf8')).codes;

// Índice de códigos válidos + deduplicación (erratum del catálogo).
const validCodes = new Set();
const codesDeduped = [];
const dupSkipped = [];
for (const c of catalog) {
  if (validCodes.has(c.codigo)) { dupSkipped.push(c); continue; }
  validCodes.add(c.codigo);
  codesDeduped.push(c);
}

// ── Asignar IDs deterministas y validar ─────────────────────────────────────
const AREA_ID = 1;
const specialties = [...mi.specialties].sort((a, b) => a.sort_order - b.sort_order);

const itemRows = [];      // { id, specialtyId, title, type, sortOrder }
const reqRows = [];       // { itemId, flags:Set }
const mapRows = [];       // { itemId, code, confidence }
let nextItemId = 1;

for (const sp of specialties) {
  if (sp.sort_order < 1 || sp.sort_order > 12) throw new Error(`sort_order fuera de rango: ${sp.name}`);
  const items = [...sp.items].sort((a, b) => a.sort_order - b.sort_order);
  for (const it of items) {
    if (!ITEM_TYPES.has(it.type)) throw new Error(`item_type inválido "${it.type}" en ${it.title}`);
    const id = nextItemId++;
    itemRows.push({ id, specialtyId: sp.sort_order, title: it.title, type: it.type, sortOrder: it.sort_order });

    const flags = new Set(it.requirements || []);
    for (const f of flags) if (!REQ_COLS.includes(f)) throw new Error(`requirement inválido "${f}" en ${it.title}`);
    reqRows.push({ itemId: id, flags });

    for (const ec of it.eunacom_codes || []) {
      if (!validCodes.has(ec.code)) throw new Error(`código inexistente en el catálogo: ${ec.code} (${it.title})`);
      const conf = ec.confidence || 'suggested';
      if (conf !== 'suggested' && conf !== 'confirmed') throw new Error(`confidence inválido "${conf}"`);
      mapRows.push({ itemId: id, code: ec.code, confidence: conf });
    }
  }
}
const presentItemIds = itemRows.map((r) => r.id);

// ── Construir el SQL ────────────────────────────────────────────────────────
const L = [];
L.push('-- ============================================================================');
L.push('-- EunaTrack — seed de contenido (GENERADO por scripts/generate-seed.mjs)');
L.push('-- NO editar a mano: re-genera con `node scripts/generate-seed.mjs`.');
L.push('-- Idempotente: seguro de re-ejecutar. Preserva los mapeos manuales');
L.push("-- (confidence = 'confirmed') y no crea filas de progreso.");
L.push('-- ============================================================================');
L.push('');
L.push('begin;');
L.push('');

// 1 · Área
L.push('-- 1 · Área');
L.push('insert into public.areas (id, name, sort_order) values');
L.push(`  (${AREA_ID}, ${q(mi.area)}, 1)`);
L.push('on conflict (id) do update set');
L.push('  name = excluded.name, sort_order = excluded.sort_order;');
L.push('');

// 2 · Especialidades
L.push('-- 2 · Especialidades (id = sort_order)');
L.push('insert into public.specialties (id, area_id, name, sort_order) values');
L.push(specialties.map((sp) => `  (${sp.sort_order}, ${AREA_ID}, ${q(sp.name)}, ${sp.sort_order})`).join(',\n') + '');
L.push('on conflict (id) do update set');
L.push('  area_id = excluded.area_id, name = excluded.name, sort_order = excluded.sort_order;');
L.push('');

// 3 · Ítems
L.push(`-- 3 · Ítems (${itemRows.length}: temas y exámenes complementarios; id correlativo global)`);
L.push('insert into public.items (id, specialty_id, title, item_type, sort_order) values');
L.push(itemRows.map((r) => `  (${r.id}, ${r.specialtyId}, ${q(r.title)}, ${q(r.type)}, ${r.sortOrder})`).join(',\n') + '');
L.push('on conflict (id) do update set');
L.push('  specialty_id = excluded.specialty_id, title = excluded.title,');
L.push('  item_type = excluded.item_type, sort_order = excluded.sort_order;');
L.push('');

// 4 · Requisitos (matriz del internado)
L.push('-- 4 · Requisitos (matriz de exigencia, 9 ejes)');
L.push(`insert into public.item_requirements (item_id, ${REQ_COLS.join(', ')}) values`);
L.push(reqRows.map((r) => `  (${r.itemId}, ${REQ_COLS.map((c) => b(r.flags.has(c))).join(', ')})`).join(',\n') + '');
L.push('on conflict (item_id) do update set');
L.push('  ' + REQ_COLS.map((c) => `${c} = excluded.${c}`).join(', ') + ';');
L.push('');

// 5 · Catálogo EUNACOM completo (deduplicado)
L.push(`-- 5 · Catálogo oficial EUNACOM 2026 (${codesDeduped.length} códigos, 7 áreas).`);
if (dupSkipped.length) {
  L.push('--   Erratum del catálogo: el código 2.01.1.046 aparece duplicado en la fuente');
  L.push('--   con dos títulos distintos. Se conserva el PRIMERO y se descarta el segundo:');
  for (const d of dupSkipped) L.push(`--     descartado: ${d.codigo} = ${d.titulo_oficial}`);
}
L.push('insert into public.eunacom_codes');
L.push('  (code, official_title, area, specialty, section, dx_level, tto_level, followup_level, extra_level) values');
L.push(codesDeduped.map((c) =>
  `  (${q(c.codigo)}, ${q(c.titulo_oficial)}, ${q(c.area)}, ${q(c.especialidad)}, ${q(c.seccion)}, ` +
  `${q(c.nivel_dx)}, ${q(c.nivel_tto)}, ${q(c.nivel_seguimiento)}, ${q(c.nivel)})`
).join(',\n') + '');
L.push('on conflict (code) do update set');
L.push('  official_title = excluded.official_title, area = excluded.area, specialty = excluded.specialty,');
L.push('  section = excluded.section, dx_level = excluded.dx_level, tto_level = excluded.tto_level,');
L.push('  followup_level = excluded.followup_level, extra_level = excluded.extra_level;');
L.push('');

// 6 · Mapeo ítem ↔ código
L.push(`-- 6 · Mapeo ítem ↔ código EUNACOM (${mapRows.length} enlaces 'suggested').`);
L.push("--   Se borran los 'suggested' de los ítems presentes y se re-insertan;");
L.push("--   los 'confirmed' (revisados a mano) se preservan vía ON CONFLICT DO NOTHING.");
L.push(`delete from public.item_eunacom_map`);
L.push(`  where confidence = 'suggested' and item_id in (${presentItemIds.join(', ')});`);
if (mapRows.length) {
  L.push('insert into public.item_eunacom_map (item_id, eunacom_code, confidence) values');
  L.push(mapRows.map((r) => `  (${r.itemId}, ${q(r.code)}, ${q(r.confidence)})`).join(',\n') + '');
  L.push('on conflict (item_id, eunacom_code) do nothing;');
}
L.push('');

// 7 · Perfil inicial (sin progreso)
L.push('-- 7 · Perfil inicial (RUT normalizado). Sin filas de progreso: se parte de cero.');
L.push("insert into public.profiles (rut) values ('20429810-6') on conflict (rut) do nothing;");
L.push('');

// 8 · Secuencias identity
L.push('-- 8 · Sincronizar secuencias identity tras insertar IDs explícitos.');
for (const t of ['areas', 'specialties', 'items']) {
  L.push(`select setval(pg_get_serial_sequence('public.${t}', 'id'), (select coalesce(max(id), 1) from public.${t}));`);
}
L.push('');
L.push('commit;');
L.push('');

writeFileSync(OUT, L.join('\n'), 'utf8');

// ── Resumen en consola ──────────────────────────────────────────────────────
console.log('seed.sql generado:', OUT);
console.log(JSON.stringify({
  specialties: specialties.length,
  items: itemRows.length,
  requirements: reqRows.length,
  eunacom_codes: codesDeduped.length,
  duplicados_descartados: dupSkipped.length,
  item_eunacom_map: mapRows.length,
}, null, 2));
