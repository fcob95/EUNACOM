#!/usr/bin/env node
// ============================================================================
// add-topics-medicina-interna.mjs — transformación ÚNICA (one-time) de
// content/medicina-interna.json: agrega un nivel de agrupación "tema" entre
// especialidad e ítem (Especialidad → Tema → Ítem en vez de Especialidad →
// Ítem), anidando los 655 ítems existentes bajo temas dentro de cada
// especialidad.
//
// Se conserva en el repo como documentación del transform. NO está enganchado
// a package.json ni se vuelve a correr en el pipeline normal — es una
// migración puntual de datos, no un paso de build repetible.
//
// Algoritmo:
//   1. Carga el content/medicina-interna.json ACTUAL (655 ítems finos, uno
//      por código EUNACOM) y el content/medicina-interna.json VIEJO (153
//      ítems amplios, commit 0ad094b, vía `git show`) — este último es la
//      fuente de los ~208 temas "heredados" (Parte 1).
//   2. Construye un mapa code -> {título, sort_order} del ítem VIEJO que
//      contenía ese código. Los códigos son globalmente únicos en todo el
//      catálogo EUNACOM, así que el mapa se indexa SOLO por código (no por
//      especialidad): el archivo viejo usa nombres/mayúsculas de especialidad
//      distintos para algunas (p.ej. "Hematología" -> "Hémato-oncología"; ver
//      SPECIALTY_ALIASES en expand-medicina-interna.mjs), y cruzar por código
//      evita ese desajuste.
//   3. Por cada especialidad ACTUAL:
//      a.  Ítems cuyo eunacom_codes[0].code aparece en ese mapa se agrupan bajo
//      el título del ítem viejo que lo contenía → temas heredados
//      (topic_confidence "confirmed"), ordenados por el sort_order original
//      del ítem viejo.
//      b.  content/topic-orphans.json (autoría manual, Parte 2) aporta temas
//      nuevos para los ítems huérfanos (sin match en el paso a). Si el
//      nombre de un tema autoría coincide EXACTO con un tema heredado de la
//      misma especialidad, sus ítems se fusionan dentro de ese tema heredado
//      (permitido explícitamente por el encargo) en vez de crear un tema
//      duplicado. Si no coincide, se añade como tema nuevo
//      (topic_confidence "suggested") después de los heredados.
//   4. Autochequeo antes de escribir: cada ítem de la especialidad queda
//      asignado a exactamente un tema (ni perdido ni duplicado); sin
//      (specialty, topic name) duplicado; sin id de tema duplicado. Un
//      título en topic-orphans.json que no exista, o que se repita, aborta
//      con un error claro.
//   5. Asigna a cada tema un "id" secuencial fresco, GLOBAL a toda el área
//      (mismo criterio que scripts/generate-seed.mjs usa para "id" de
//      ítems: estable, explícito, nunca recalculado por posición en el
//      futuro) y un sort_order único dentro de su especialidad (heredados
//      conservan la posición original del ítem viejo; autoría, posiciones
//      secuenciales después).
//   6. Escribe content/medicina-interna.json con la forma anidada
//      { area, specialties: [{ name, sort_order, topics: [{ id, name,
//      sort_order, topic_confidence, items: [...] }] }] } — las 12
//      especialidades presentes, "Urgencias" con topics: [].
//   7. Escribe content/topic-review.md listando cada tema "suggested" con
//      sus ítems, para revisión humana posterior.
//
// Uso:  node scripts/add-topics-medicina-interna.mjs
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_MI = join(ROOT, 'content', 'medicina-interna.json');
const CONTENT_ORPHANS = join(ROOT, 'content', 'topic-orphans.json');
const OUT_REVIEW = join(ROOT, 'content', 'topic-review.md');
const OLD_COMMIT = '0ad094b';

// ── 1 · Cargar contenido ─────────────────────────────────────────────────
const currentMi = JSON.parse(readFileSync(CONTENT_MI, 'utf8'));
const oldMiRaw = execFileSync('git', ['show', `${OLD_COMMIT}:content/medicina-interna.json`], {
  cwd: ROOT,
  encoding: 'utf8',
});
const oldMi = JSON.parse(oldMiRaw);
const topicOrphans = JSON.parse(readFileSync(CONTENT_ORPHANS, 'utf8'));

// ── 2 · Mapa code -> {título, sort_order} del ítem VIEJO que lo contenía ───
// Indexado SOLO por código (ver nota de cabecera sobre nombres de
// especialidad distintos entre el archivo viejo y el actual).
//
// Erratum conocido del archivo viejo: el código 1.06.1.020 aparece bajo DOS
// ítems distintos de Gastroenterología ("Hepatitis virales" y "DILI/HILI
// (Drug & herb induced liver injury)"). Se resuelve con "última ocurrencia
// gana" (mismo criterio ya usado al construir content/topic-orphans.json vía
// un Map code->título de una sola pasada) para mantener consistencia con el
// mapeo Parte 1 ya validado (208 ítems heredados / 447 huérfanos).
const codeToOldItem = new Map(); // code -> { title, sortOrder }
const duplicateOldCodes = []; // para el resumen en consola, no es fatal
for (const sp of oldMi.specialties) {
  for (const item of sp.items) {
    for (const ec of item.eunacom_codes || []) {
      if (codeToOldItem.has(ec.code)) {
        duplicateOldCodes.push({ code: ec.code, discarded: codeToOldItem.get(ec.code).title, kept: item.title });
      }
      codeToOldItem.set(ec.code, { title: item.title, sortOrder: item.sort_order });
    }
  }
}

// ── 3 · Construir especialidades con temas anidados ─────────────────────────
let totalItemsIn = 0;
let totalItemsOut = 0;
let nextTopicId = 1;
const outSpecialties = [];
const consumedOrphanSpecialties = new Set();

for (const sp of [...currentMi.specialties].sort((a, b) => a.sort_order - b.sort_order)) {
  totalItemsIn += sp.items.length;

  const itemsByTitle = new Map();
  for (const it of sp.items) {
    if (itemsByTitle.has(it.title)) {
      throw new Error(`(specialty, title) duplicado en content/medicina-interna.json actual: "${sp.name}" / "${it.title}"`);
    }
    itemsByTitle.set(it.title, it);
  }
  const claimed = new Set(); // títulos ya asignados a un tema

  // 3a · Temas heredados (Parte 1)
  const inheritedGroups = new Map(); // old title -> { title, oldSortOrder, items: [] }
  for (const it of sp.items) {
    const code = it.eunacom_codes && it.eunacom_codes[0] && it.eunacom_codes[0].code;
    const old = code ? codeToOldItem.get(code) : undefined;
    if (!old) continue;
    let g = inheritedGroups.get(old.title);
    if (!g) {
      g = { title: old.title, oldSortOrder: old.sortOrder, items: [] };
      inheritedGroups.set(old.title, g);
    }
    g.items.push(it);
    claimed.add(it.title);
  }
  const inheritedList = [...inheritedGroups.values()].sort((a, b) => a.oldSortOrder - b.oldSortOrder);
  const inheritedByName = new Map(inheritedList.map((g) => [g.title, g]));

  // 3b · Temas nuevos (Parte 2, topic-orphans.json)
  const authoredDefs = topicOrphans[sp.name] || [];
  if (sp.name in topicOrphans) consumedOrphanSpecialties.add(sp.name);
  const newAuthoredList = []; // temas nuevos, no fusionados en un heredado
  const newAuthoredByName = new Map();

  for (const def of authoredDefs) {
    if (!def.name || !Array.isArray(def.items)) {
      throw new Error(`content/topic-orphans.json: entrada inválida en "${sp.name}": ${JSON.stringify(def)}`);
    }
    const items = [];
    for (const title of def.items) {
      const it = itemsByTitle.get(title);
      if (!it) {
        throw new Error(
          `content/topic-orphans.json: "${sp.name}" / tema "${def.name}" referencia un ítem que no existe en content/medicina-interna.json: "${title}"`
        );
      }
      if (claimed.has(title)) {
        throw new Error(
          `content/topic-orphans.json: ítem "${title}" (especialidad "${sp.name}") aparece más de una vez (ya heredado o ya asignado a otro tema)`
        );
      }
      claimed.add(title);
      items.push(it);
    }

    if (inheritedByName.has(def.name)) {
      // Permitido explícitamente: un tema autoría puede unirse a un tema
      // heredado si el nombre coincide exacto con el mismo genuinamente.
      inheritedByName.get(def.name).items.push(...items);
    } else if (newAuthoredByName.has(def.name)) {
      throw new Error(
        `content/topic-orphans.json: tema "${def.name}" repetido dentro de "${sp.name}" (nombre de tema duplicado, no heredado)`
      );
    } else {
      const g = { name: def.name, items };
      newAuthoredList.push(g);
      newAuthoredByName.set(def.name, g);
    }
  }

  // 3c · Autochequeo de cobertura: todo ítem de la especialidad, asignado.
  const unclaimed = sp.items.filter((it) => !claimed.has(it.title));
  if (unclaimed.length) {
    throw new Error(
      `Especialidad "${sp.name}": ${unclaimed.length} ítem(s) sin tema asignado (ni heredado ni en topic-orphans.json): ` +
      unclaimed.map((i) => i.title).join(', ')
    );
  }

  // 3d · sort_order + topic_confidence + id
  const topics = [];
  for (const g of inheritedList) {
    topics.push({
      id: nextTopicId++,
      name: g.title,
      sort_order: g.oldSortOrder,
      topic_confidence: 'confirmed',
      items: g.items,
    });
  }
  const maxInheritedSortOrder = topics.reduce((m, t) => Math.max(m, t.sort_order), 0);
  let nextSortOrder = maxInheritedSortOrder + 1;
  for (const g of newAuthoredList) {
    topics.push({
      id: nextTopicId++,
      name: g.name,
      sort_order: nextSortOrder++,
      topic_confidence: 'suggested',
      items: g.items,
    });
  }

  totalItemsOut += topics.reduce((a, t) => a + t.items.length, 0);
  outSpecialties.push({ name: sp.name, sort_order: sp.sort_order, topics });
}

// ── 3e · topic-orphans.json no debe mencionar especialidades inexistentes ──
const unknownOrphanSpecialties = Object.keys(topicOrphans).filter((k) => !consumedOrphanSpecialties.has(k));
if (unknownOrphanSpecialties.length) {
  throw new Error(
    `content/topic-orphans.json menciona especialidad(es) que no existen en content/medicina-interna.json: ${unknownOrphanSpecialties.join(', ')}`
  );
}

// ── 4 · Autochequeos globales ────────────────────────────────────────────
if (totalItemsIn !== totalItemsOut) {
  throw new Error(`Conteo de ítems inconsistente: entrada=${totalItemsIn}, salida=${totalItemsOut}`);
}

// Ningún ítem perdido ni duplicado (por id global de ítem, más fuerte que título).
const seenItemIds = new Map(); // item id -> "specialty/topic/title"
for (const sp of outSpecialties) {
  for (const topic of sp.topics) {
    for (const it of topic.items) {
      const key = typeof it.id === 'number' ? it.id : `notitle:${sp.name}|||${it.title}`;
      if (seenItemIds.has(key)) {
        throw new Error(
          `Ítem duplicado entre temas: "${it.title}" — visto en "${seenItemIds.get(key)}" y en "${sp.name} / ${topic.name}"`
        );
      }
      seenItemIds.set(key, `${sp.name} / ${topic.name}`);
    }
  }
}

// Sin (specialty, topic name) duplicado.
const seenTopicNames = new Set();
for (const sp of outSpecialties) {
  for (const topic of sp.topics) {
    const key = `${sp.name}|||${topic.name}`;
    if (seenTopicNames.has(key)) {
      throw new Error(`(specialty, topic name) duplicado: "${sp.name}" / "${topic.name}"`);
    }
    seenTopicNames.add(key);
  }
}

// Sin id de tema duplicado, y sort_order único dentro de cada especialidad.
const seenTopicIds = new Set();
for (const sp of outSpecialties) {
  const seenSortOrders = new Set();
  for (const topic of sp.topics) {
    if (seenTopicIds.has(topic.id)) throw new Error(`id de tema duplicado: ${topic.id}`);
    seenTopicIds.add(topic.id);
    if (seenSortOrders.has(topic.sort_order)) {
      throw new Error(`sort_order de tema duplicado dentro de "${sp.name}": ${topic.sort_order} (tema "${topic.name}")`);
    }
    seenSortOrders.add(topic.sort_order);
  }
}

if (totalItemsOut !== 655) {
  throw new Error(`Se esperaban 655 ítems en total; se obtuvieron ${totalItemsOut}.`);
}

// ── 5 · Escribir content/medicina-interna.json ──────────────────────────────
const output = { area: currentMi.area, specialties: outSpecialties };
writeFileSync(CONTENT_MI, JSON.stringify(output, null, 2) + '\n', 'utf8');

// ── 6 · content/topic-review.md — temas "suggested" para revisión humana ───
const reviewLines = [];
reviewLines.push('# Revisión de temas nuevos (topic_confidence: "suggested")');
reviewLines.push('');
reviewLines.push(
  'Generado por `scripts/add-topics-medicina-interna.mjs`. Lista cada tema NUEVO ' +
  '(autoría de `content/topic-orphans.json`, sin equivalente en el temario viejo de ' +
  '153 ítems) con sus ítems, para revisión clínica posterior. Los temas ' +
  '"confirmed" (heredados del temario viejo) no aparecen aquí — ver el ' +
  'commit `0ad094b` para su origen.'
);
reviewLines.push('');

let suggestedTopicCount = 0;
let suggestedItemCount = 0;
for (const sp of outSpecialties) {
  const suggested = sp.topics.filter((t) => t.topic_confidence === 'suggested');
  if (!suggested.length) continue;
  reviewLines.push(`## ${sp.name} (${suggested.length} temas nuevos)`);
  reviewLines.push('');
  for (const topic of suggested) {
    suggestedTopicCount += 1;
    suggestedItemCount += topic.items.length;
    reviewLines.push(`- **${topic.name}** (${topic.items.length} ítems)`);
    for (const it of topic.items) reviewLines.push(`  - ${it.title}`);
  }
  reviewLines.push('');
}
reviewLines.push('---');
reviewLines.push('');
reviewLines.push(`Total: ${suggestedTopicCount} temas nuevos, ${suggestedItemCount} ítems.`);
reviewLines.push('');

writeFileSync(OUT_REVIEW, reviewLines.join('\n'), 'utf8');

// ── 7 · Resumen en consola ───────────────────────────────────────────────────
console.log('content/medicina-interna.json regenerado (con temas):', CONTENT_MI);
console.log('content/topic-review.md generado:', OUT_REVIEW);
console.log('');
if (duplicateOldCodes.length) {
  console.log('Erratum del archivo viejo (código EUNACOM repetido, se usó la última ocurrencia):');
  for (const d of duplicateOldCodes) {
    console.log(`  ${d.code}: descartado "${d.discarded}", usado "${d.kept}"`);
  }
  console.log('');
}
console.log('Temas por especialidad:');
let totalTopics = 0;
let totalConfirmed = 0;
let totalSuggested = 0;
for (const sp of outSpecialties) {
  const confirmed = sp.topics.filter((t) => t.topic_confidence === 'confirmed').length;
  const suggested = sp.topics.filter((t) => t.topic_confidence === 'suggested').length;
  totalTopics += sp.topics.length;
  totalConfirmed += confirmed;
  totalSuggested += suggested;
  const items = sp.topics.reduce((a, t) => a + t.items.length, 0);
  console.log(
    `  ${sp.name.padEnd(28)} topics=${String(sp.topics.length).padEnd(3)} ` +
    `(confirmed=${String(confirmed).padEnd(3)} suggested=${String(suggested).padEnd(3)}) items=${items}`
  );
}
console.log('');
console.log(JSON.stringify({
  total_specialties: outSpecialties.length,
  total_topics: totalTopics,
  total_topics_confirmed: totalConfirmed,
  total_topics_suggested: totalSuggested,
  total_items: totalItemsOut,
  self_check: 'OK (sin ítem perdido/duplicado, sin (specialty,topic) duplicado, sin id de tema duplicado)',
}, null, 2));
