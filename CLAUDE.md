# EunaTrack — memoria de proyecto

Web app para que estudiantes de medicina en Chile trackeen su preparación del EUNACOM.
Usuario inicial: interno cursando Medicina Interna. Uso diario desde el teléfono con una
mano (**móvil primero**), también tablet/PC. UI en español; código y DB en inglés.

## Stack

- Next.js 15 (App Router, TypeScript estricto), React 19, pnpm, deploy en Vercel.
- Tailwind CSS v4: tokens CSS-first en `src/app/globals.css`. Nunca hex hardcodeado.
- shadcn/ui (componentes copiados en `src/components/ui`), lucide-react, Recharts, sonner.
- Supabase: Postgres + RLS + auth anónima. Tipos generados en `src/types/supabase.ts`.
- @tanstack/react-query v5 (optimistic updates), Zod.

## Estructura

- `src/app` — rutas: `/login`, `/panel`, `/dashboard`, `/planificador`, `/perfil`.
- `src/components` (+ `/ui` de shadcn) — componentes compartidos.
- `src/features` — módulos: `auth-rut`, `content`, `progress`, `planner` (futuro: `ai-tutor`, desactivado).
- `src/lib` — `rut.ts` (RUT canónico), `supabase.ts` (cliente), `utils.ts`.
- `src/types` — tipos, incl. `supabase.ts` generado.
- `supabase/migrations` + `supabase/seed.sql` — esquema y datos.
- `content/` — JSON de contenido médico (fuente del seed).
- `scripts/generate-seed.mjs` — genera seed SQL desde `content/`.
- `claude-design/` — **SOLO LECTURA**: fuente de verdad visual (mockups, tokens, datos crudos).

## Reglas de negocio CLAVE

### Fórmula de progreso (5 × 20%)
`pct(item) = (studied + review1 + review2 + questions_done + cases_done) × 20`.
Agregados (especialidad/área/global) = **promedio** de pct; ítems sin fila de progreso = 0.
Vive en DOS lados que deben mantenerse consistentes:
- SQL: función `progress_pct()` + vistas `v_item_progress_pct`, `v_specialty_progress`, `v_area_progress`.
- TS: `src/features/progress`. Cualquier cambio se hace **en ambos lados o en ninguno**.
Ver skill `progress-model`.

### Identidad (login por RUT, sin contraseña)
Sesión anónima de Supabase → RPC `login_with_rut()` (SECURITY DEFINER) valida el DV,
hace upsert del profile y vincula `auth.uid()` ↔ profile. RLS aísla por `current_profile_id()`.
**Limitación conocida y documentada**: cualquiera con un RUT válido accede a ese perfil
(aceptada para el MVP, advertida en README). Ver skill `rut-chileno`.

### Otras reglas
- El planificador prioriza Medicina Interna y se recalcula según el avance real.
- Escalabilidad: el temario crece por **DATOS** (seed), no por código. Nada hardcodeado
  a Medicina Interna en la UI ni en las queries.
- Accesibilidad: targets táctiles ≥44px, contraste AA, estados cargando/vacío/error en
  toda pantalla.

## Comandos

- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm lint:fix` / `pnpm typecheck`
- `pnpm seed:generate` — regenera `supabase/seed.sql` desde `content/`.
- `pnpm db:types` — `supabase gen types typescript --linked > src/types/supabase.ts`.
- `supabase db push` — aplica migraciones al proyecto vinculado.
- Seed: vía SQL Editor del dashboard o `supabase db reset` en local.

## MCP de Supabase

`.mcp.json` define el server oficial (`@supabase/mcp-server-supabase`). Requiere exportar
`SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` (ver `.env.example`; nunca commitearlos).
Consumidores principales: los subagentes **db-architect** y **supabase-integrator**.

## NO hacer

- Commitear secretos (`.env*`).
- Migraciones destructivas (`DROP`/`TRUNCATE`) sin confirmación explícita del usuario.
- Modificar `claude-design/` (solo lectura).
- Introducir dependencias fuera del stack sin justificarlo antes.

## Infraestructura .claude/

- Subagentes (`.claude/agents/`): `db-architect` (esquema/RLS, opus), `ui-builder`
  (pantallas desde claude-design/), `supabase-integrator` (queries/hooks/auth),
  `seed-content` (contenido → seed), `qa-reviewer` (revisión read-only + checks).
- Skills (`.claude/skills/`): `rut-chileno`, `supabase-patterns`, `component-conventions`,
  `progress-model`.
- Hooks (`.claude/settings.json` + `.claude/hooks/*.sh`): typecheck tras editar TS,
  guard de comandos Bash peligrosos, contexto al iniciar sesión, log al terminar.
