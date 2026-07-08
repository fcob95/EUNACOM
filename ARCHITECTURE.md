# ARCHITECTURE

## Stack

- **Next.js 15** (App Router, TypeScript estricto) + **React 19** — SSR y rutas de app.
- **Tailwind CSS v4**: tokens CSS-first en `src/app/globals.css`, sin hex hardcodeado.
- **shadcn/ui** (componentes copiados en `src/components/ui`) + **lucide-react** + **Recharts** + **sonner**.
- **Supabase** (Postgres + RLS + auth anónima) — backend único, sin servidor propio.
- **@tanstack/react-query v5** — cache/mutaciones con optimistic updates.
- **Zod** — validación (RUT, formularios).
- **pnpm** — gestor de paquetes; deploy en **Vercel**.

## Mapa de directorios

```
src/app/                  rutas (App Router)
  login/                  login por RUT
  (app)/panel/            resumen general
  (app)/dashboard/        detalle de progreso
  (app)/planificador/     plan de estudio
  (app)/perfil/           ajustes de usuario
src/components/           componentes compartidos (ItemCard, ProgressBar, ProgressRing,
                           SpecialtyAccordion, FilterControls, AppNav, RutInput, ...)
src/components/ui/        shadcn/ui (button, input, sheet, accordion, switch, slider, ...)
src/features/
  auth-rut/                ProfileProvider (sesión anónima + login_with_rut)
  content/                 useContent (áreas/especialidades/ítems desde Supabase)
  progress/                model.ts (fórmula 5×20%) + useProgress (hooks react-query)
  planner/                 model.ts (lógica de priorización del plan de estudio)
  ai-tutor/                desactivado, fuera del MVP
src/lib/                  rut.ts (RUT canónico), supabase.ts (cliente), utils.ts
src/types/                domain.ts + supabase.ts (generado con `pnpm db:types`)
supabase/
  migrations/0001_init.sql esquema inicial completo
  seed.sql                  generado desde content/ vía scripts/generate-seed.mjs
content/                  medicina-interna.json, eunacom-codes.json (fuente del seed)
scripts/generate-seed.mjs content/*.json → supabase/seed.sql
claude-design/            SOLO LECTURA: mockups y tokens visuales (fuente de verdad UI)
.claude/                  agentes, skills y hooks de Claude Code
```

## Esquema de datos (migración `0001_init.sql`)

- **Contenido** (lectura pública vía RLS): `areas` → `specialties` → `items`,
  `item_requirements`, `eunacom_codes`, `item_eunacom_map`.
- **Identidad**: `profiles` (RUT canónico) + `profile_auth_links` (vincula
  `auth.uid()` ↔ profile; soporta múltiples métodos de auth a futuro).
- **Progreso**: `item_progress` (una fila por ítem×perfil, 5 columnas booleanas que
  alimentan `progress_pct()`).
- RLS activo en todas las tablas de identidad/progreso vía `current_profile_id()`;
  contenido es de lectura pública.

## Cómo se conectan las piezas

1. El cliente abre sesión anónima de Supabase (persistida en `localStorage`).
2. `login_with_rut()` (RPC, `SECURITY DEFINER`) valida el DV del RUT, hace upsert
   del `profile` y crea el vínculo `auth.uid()` ↔ profile.
3. Las queries de contenido (`useContent`) y progreso (`useProgress`) van directo a
   Supabase vía `@supabase/supabase-js`, tipadas con `src/types/supabase.ts`.
4. El progreso se calcula en dos lugares que deben mantenerse sincronizados:
   SQL (`progress_pct()` + vistas `v_item_progress_pct`, `v_specialty_progress`,
   `v_area_progress`) y TS (`src/features/progress/model.ts`).
5. El temario crece por datos: `content/*.json` → `pnpm seed:generate` →
   `supabase/seed.sql` → aplicado vía SQL Editor o `supabase db reset`.

## Cómo correr el proyecto

```bash
pnpm install
pnpm dev            # requiere .env.local con credenciales de Supabase
```

Detalle de setup completo (proyecto Supabase, migraciones, variables de entorno)
en `README.md`.
