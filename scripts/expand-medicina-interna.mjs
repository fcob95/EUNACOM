#!/usr/bin/env node
// ============================================================================
// expand-medicina-interna.mjs — transformación ÚNICA (one-time) de
// content/medicina-interna.json: de ~153 ítems amplios (que agrupan varios
// códigos EUNACOM bajo un solo checkbox) a ~655 ítems finos, uno por cada
// código oficial EUNACOM 2026 del área "Medicina Interna".
//
// Se conserva en el repo como documentación del transform. NO está enganchado
// a package.json ni se vuelve a correr en el pipeline normal — es una
// migración puntual de datos, no un paso de build repetible.
//
// Algoritmo (ver encargo original para el detalle completo):
//   1. Filtra content/eunacom-codes.json a area === "Medicina Interna".
//   2. Antes de sobrescribir nada, lee el content/medicina-interna.json
//      ACTUAL (153 ítems con "id" estable) y construye un mapa
//      code -> {fisiopatologia, conocimiento_general, estudio_complicaciones}
//      heredando esos 3 ejes (sin equivalente en el catálogo) del ítem amplio
//      que hoy contiene ese código. Códigos sin match heredan los 3 en false.
//   3. Tabla de alias especialidad (eunacom-codes.json) -> specialty de la app
//      (nombre + sort_order, este último se mantiene sin cambios).
//   4. Por cada código: title = titulo_oficial verbatim; item_type según
//      seccion; requirements = ejes directos (nivel_dx/nivel_tto/
//      nivel_seguimiento) + los 3 heredados; eunacom_codes = 1 entrada
//      confidence "confirmed" (mapeo 1:1 por construcción); sort_order por
//      especialidad según orden ascendente de codigo; id secuencial global.
//   5. Colisiones de título dentro de una misma especialidad (constraint
//      unique (specialty_id, title)) se desambiguan con un sufijo según
//      seccion.
//   6. Self-check: sin (specialty, title) duplicado, sin id duplicado.
//   7. Escribe content/medicina-interna.json con las 12 especialidades
//      (Urgencias con items: [] — no tiene especialidad propia en el
//      catálogo, la urgencia es un valor de "seccion" transversal).
//
// Uso:  node scripts/expand-medicina-interna.mjs
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_MI = join(ROOT, 'content', 'medicina-interna.json');
const CONTENT_CODES = join(ROOT, 'content', 'eunacom-codes.json');

// Orden canónico de los 9 ejes de item_requirements (igual al de
// scripts/generate-seed.mjs), solo por legibilidad del JSON de salida.
const REQ_ORDER = [
  'fisiopatologia', 'conocimiento_general', 'dx_sospecha', 'dx_especifico',
  'tto_inicial', 'tto_completo', 'estudio_complicaciones',
  'seguimiento_derivar', 'seguimiento_cronico',
];

// Los 3 ejes SIN equivalente en eunacom-codes.json: se heredan del ítem
// amplio (versión actual de medicina-interna.json) que contenía ese código.
const INHERITED_FLAGS = ['fisiopatologia', 'conocimiento_general', 'estudio_complicaciones'];

// Tabla de alias: especialidad (eunacom-codes.json) -> specialty de la app.
// sort_order idéntico al de la versión actual de medicina-interna.json
// (referenciado en otras partes, no se puede renumerar).
const SPECIALTY_ALIASES = {
  'Cardiología': { name: 'Cardiología', sort_order: 1 },
  'Nefrología': { name: 'Nefrología', sort_order: 2 },
  'Gastroenterología': { name: 'Gastroenterología', sort_order: 3 },
  'Neurología': { name: 'Neurología', sort_order: 4 },
  'Geriatría': { name: 'Geriatría', sort_order: 5 },
  'Diabetes y nutrición': { name: 'Nutrición y Diabetes', sort_order: 6 },
  'Hémato-oncología': { name: 'Hémato-oncología', sort_order: 7 }, // rename desde "Hematología"
  'Reumatología': { name: 'Reumatología', sort_order: 8 },
  'Enfermedades respiratorias': { name: 'Enfermedades Respiratorias', sort_order: 9 },
  'Endocrinología': { name: 'Endocrinología', sort_order: 10 }, // hoy vacía, se puebla
  'Enfermedades infecciosas': { name: 'Enfermedades Infecciosas', sort_order: 12 }, // hoy vacía, se puebla
};

// "Urgencias" no es una especialidad propia en eunacom-codes.json (la
// urgencia es el valor de "seccion" = "Situaciones clínicas de urgencia",
// transversal a todas las especialidades de arriba). Se deja vacía.
const EMPTY_SPECIALTIES = [{ name: 'Urgencias', sort_order: 11 }];

// Sufijo de desambiguación para títulos que colisionan dentro de la misma
// especialidad (constraint unique (specialty_id, title)).
const SECCION_SUFFIX = {
  'Situaciones clínicas': ' (clínica)',
  'Situaciones clínicas de urgencia': ' (urgencia)',
  'Conocimientos generales': ' (conocimientos)',
  'Exámenes e imagenología': ' (examen)',
  'Procedimientos diagnósticos y terapéuticos': ' (procedimiento)',
};

function orderRequirements(flagsSet) {
  return REQ_ORDER.filter((f) => flagsSet.has(f));
}

// ── 1 · Cargar y filtrar el catálogo EUNACOM ────────────────────────────────
const catalog = JSON.parse(readFileSync(CONTENT_CODES, 'utf8')).codes;
const miCodes = catalog.filter((c) => c.area === 'Medicina Interna');

const unknownEspecialidades = [...new Set(miCodes.map((c) => c.especialidad))]
  .filter((e) => !(e in SPECIALTY_ALIASES));
if (unknownEspecialidades.length) {
  throw new Error(
    `especialidad(es) en eunacom-codes.json sin alias definido: ${unknownEspecialidades.join(', ')}`
  );
}

const unknownSecciones = [...new Set(miCodes.map((c) => c.seccion))]
  .filter((s) => s !== 'Exámenes e imagenología' && !(s in SECCION_SUFFIX));
if (unknownSecciones.length) {
  throw new Error(`seccion(es) sin sufijo de colisión definido: ${unknownSecciones.join(', ')}`);
}

// ── 2 · Mapa de herencia desde el content/medicina-interna.json ACTUAL ──────
const oldMi = JSON.parse(readFileSync(CONTENT_MI, 'utf8'));
const inheritedByCode = new Map(); // code -> { fisiopatologia, conocimiento_general, estudio_complicaciones }

for (const sp of oldMi.specialties) {
  for (const item of sp.items) {
    const reqs = new Set(item.requirements || []);
    const flags = {
      fisiopatologia: reqs.has('fisiopatologia'),
      conocimiento_general: reqs.has('conocimiento_general'),
      estudio_complicaciones: reqs.has('estudio_complicaciones'),
    };
    for (const ec of item.eunacom_codes || []) {
      inheritedByCode.set(ec.code, flags);
    }
  }
}

let matchedCount = 0;
let defaultedCount = 0;
const flagTrueCounts = { fisiopatologia: 0, conocimiento_general: 0, estudio_complicaciones: 0 };

// ── 3 · Agrupar códigos por especialidad de destino ─────────────────────────
const bySpecialty = new Map(); // sort_order -> { name, sort_order, codes: [] }
for (const alias of Object.values(SPECIALTY_ALIASES)) {
  bySpecialty.set(alias.sort_order, { name: alias.name, sort_order: alias.sort_order, codes: [] });
}
for (const empty of EMPTY_SPECIALTIES) {
  bySpecialty.set(empty.sort_order, { name: empty.name, sort_order: empty.sort_order, codes: [] });
}
for (const c of miCodes) {
  const alias = SPECIALTY_ALIASES[c.especialidad];
  bySpecialty.get(alias.sort_order).codes.push(c);
}

// ── 4 · Construir ítems finos, por especialidad ─────────────────────────────
let nextId = 1;
let collisionGroups = 0;
let collisionCodes = 0;

const outSpecialties = [...bySpecialty.values()]
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((sp) => {
    // Orden por codigo ascendente (formato fijo D.DD.D.DDD -> sort de string
    // equivale a sort jerárquico numérico).
    const sorted = [...sp.codes].sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0));

    // Detectar colisiones de título dentro de esta especialidad.
    const titleGroups = new Map(); // titulo_oficial -> códigos[]
    for (const c of sorted) {
      const arr = titleGroups.get(c.titulo_oficial) || [];
      arr.push(c);
      titleGroups.set(c.titulo_oficial, arr);
    }
    for (const group of titleGroups.values()) {
      if (group.length > 1) {
        collisionGroups += 1;
        collisionCodes += group.length;
      }
    }

    const items = sorted.map((c, idx) => {
      const group = titleGroups.get(c.titulo_oficial);
      let title = c.titulo_oficial;
      if (group.length > 1) {
        const suffix = SECCION_SUFFIX[c.seccion];
        if (!suffix) {
          throw new Error(
            `Colisión de título sin sufijo definido para seccion "${c.seccion}" (código ${c.codigo}, título "${c.titulo_oficial}")`
          );
        }
        title = `${c.titulo_oficial}${suffix}`;
      }

      const flags = new Set();
      if (c.nivel_dx === 'Sospecha') flags.add('dx_sospecha');
      if (c.nivel_dx === 'Específico') flags.add('dx_especifico');
      if (c.nivel_tto === 'Inicial') flags.add('tto_inicial');
      if (c.nivel_tto === 'Completo') flags.add('tto_completo');
      if (c.nivel_seguimiento === 'Derivar') flags.add('seguimiento_derivar');
      if (c.nivel_seguimiento === 'Completo') flags.add('seguimiento_cronico');
      // nivel_seguimiento === 'No requiere' (o cualquier campo null) no aporta nada.

      const inherited = inheritedByCode.get(c.codigo);
      if (inherited) {
        matchedCount += 1;
      } else {
        defaultedCount += 1;
      }
      for (const flag of INHERITED_FLAGS) {
        const value = inherited ? inherited[flag] : false;
        if (value) {
          flags.add(flag);
          flagTrueCounts[flag] += 1;
        }
      }

      return {
        id: nextId++,
        title,
        type: c.seccion === 'Exámenes e imagenología' ? 'examen_complementario' : 'tema',
        sort_order: idx + 1,
        requirements: orderRequirements(flags),
        eunacom_codes: [{ code: c.codigo, confidence: 'confirmed' }],
      };
    });

    return { name: sp.name, sort_order: sp.sort_order, items };
  });

// ── 5 · Self-check antes de escribir ─────────────────────────────────────────
const seenTitleKeys = new Map(); // "specialty|||title" -> código
const seenIds = new Map(); // id -> "specialty/título"
for (const sp of outSpecialties) {
  for (const item of sp.items) {
    const titleKey = `${sp.name}|||${item.title}`;
    if (seenTitleKeys.has(titleKey)) {
      throw new Error(
        `(specialty, title) duplicado: "${sp.name}" / "${item.title}" — códigos ${seenTitleKeys.get(titleKey)} y ${item.eunacom_codes[0].code}`
      );
    }
    seenTitleKeys.set(titleKey, item.eunacom_codes[0].code);

    if (seenIds.has(item.id)) {
      throw new Error(`id duplicado: ${item.id} — "${seenIds.get(item.id)}" y "${sp.name} / ${item.title}"`);
    }
    seenIds.set(item.id, `${sp.name} / ${item.title}`);
  }
}

// ── 6 · Escribir content/medicina-interna.json ──────────────────────────────
const output = { area: 'Medicina Interna', specialties: outSpecialties };
writeFileSync(CONTENT_MI, JSON.stringify(output, null, 2) + '\n', 'utf8');

// ── 7 · Resumen en consola ───────────────────────────────────────────────────
const totalItems = outSpecialties.reduce((acc, sp) => acc + sp.items.length, 0);

console.log('content/medicina-interna.json regenerado:', CONTENT_MI);
console.log('');
console.log('Ítems por especialidad:');
for (const sp of outSpecialties) {
  console.log(`  ${sp.name.padEnd(28)} sort_order=${String(sp.sort_order).padEnd(2)} items=${sp.items.length}`);
}
console.log('');
console.log(JSON.stringify({
  total_items: totalItems,
  codigos_medicina_interna_filtrados: miCodes.length,
  herencia_de_3_ejes: {
    codigos_con_match_en_json_actual: matchedCount,
    codigos_sin_match_default_false: defaultedCount,
    conteo_true_por_eje: flagTrueCounts,
  },
  colisiones_de_titulo: {
    grupos: collisionGroups,
    codigos_afectados: collisionCodes,
  },
  self_check: 'OK (sin (specialty,title) duplicado, sin id duplicado)',
}, null, 2));
