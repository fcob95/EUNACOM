# PROGRESS
_Last updated: 2026-07-08T11:57:00-04:00 · Contexto inicial creado; repo git conectado a GitHub_

## Quick context
EunaTrack: app móvil-primero para que estudiantes de medicina en Chile trackeen su
preparación del EUNACOM. Login por RUT sin contraseña, progreso por 5 dimensiones,
temario cargado por datos.

## Decisions taken
- Identidad sin contraseña vía RUT + sesión anónima de Supabase (`login_with_rut()`):
  simplicidad para el usuario, limitación de seguridad aceptada y documentada en README.
- Fórmula de progreso `(studied + review1 + review2 + questions_done + cases_done) × 20`
  vive espejada en SQL (`progress_pct()` + vistas) y TS (`src/features/progress`).
- Temario escalable por datos (`content/*.json` → seed), cero hardcode de especialidad
  en UI ni queries.
- Repositorio remoto: `https://github.com/fcob95/EUNACOM.git` (estaba vacío al conectar).

## Current state
- Next.js scaffolding completo: rutas `/login`, `/panel`, `/dashboard`, `/planificador`,
  `/perfil` implementadas (no solo stubs).
- Auth por RUT implementado end-to-end (`ProfileProvider`, `RutInput`, RPC
  `login_with_rut`).
- Esquema de datos inicial aplicado en `supabase/migrations/0001_init.sql`: contenido
  (`areas`/`specialties`/`items`/`eunacom_codes`), identidad (`profiles`,
  `profile_auth_links`), progreso (`item_progress`), RLS activo en todas las tablas
  de identidad/progreso.
- Contenido semilla: solo Medicina Interna cargada (`content/medicina-interna.json`)
  + catálogo completo de códigos EUNACOM (`content/eunacom-codes.json`).
- Componentes UI construidos (`ItemCard`, `ProgressBar`, `ProgressRing`,
  `SpecialtyAccordion`, `FilterControls`, `AppNav`, etc.) sobre shadcn/ui.
- No había repo git local ni archivos de contexto (`PROGRESS.md`,
  `TAREAS-FRANCISCO.md`, `ARCHITECTURE.md`) — se crean en esta sesión.

## Next steps
1. Hacer el primer commit y push al remoto `fcob95/EUNACOM`.
2. Confirmar que el proyecto Supabase esté enlazado y `.env.local` configurado
   (ver `TAREAS-FRANCISCO.md`).
3. Cargar el resto del temario (~1.557 ítems, 7 áreas del Perfil EUNACOM 2026) vía
   `content/*.json` + `pnpm seed:generate`.
4. Validar el flujo de login end-to-end contra un proyecto Supabase real.

## Pending decisions
- Ninguna abierta por ahora.
