# EunaTrack

Web app para que estudiantes de medicina en Chile trackeen su preparación del **EUNACOM**.
Pensada para uso diario desde el teléfono con una mano (móvil primero), también tablet y PC.
Usuario inicial: interno cursando Medicina Interna — pero el temario completo (~1.557 ítems
del Perfil EUNACOM 2026) entra por datos, sin tocar código.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript estricto
- **Tailwind CSS v4** (tokens CSS-first en `src/app/globals.css`) + **shadcn/ui** + lucide-react + Recharts
- **Supabase** (Postgres + RLS + auth anónima)
- **@tanstack/react-query v5** (optimistic updates) + **Zod**
- **pnpm** · deploy en **Vercel**

## Setup

1. **Dependencias**
   ```bash
   pnpm install
   ```
2. **Proyecto Supabase**: crea uno en [supabase.com](https://supabase.com).
3. **Habilita sesiones anónimas** (imprescindible): en el dashboard,
   `Authentication → Providers → Anonymous sign-ins` → **Enable**. Sin esto el login no funciona.
4. **Esquema y datos**: corre `supabase/migrations/0001_init.sql` y luego `supabase/seed.sql`.
   - Opción A — SQL Editor del dashboard: pega y ejecuta cada archivo en orden.
   - Opción B — CLI: `supabase link --project-ref <ref>` y `supabase db push`
     (migraciones); el seed vía SQL Editor o `supabase db reset` en local.
5. **Variables de entorno**: copia `.env.example` → `.env.local` y completa
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
   Nunca commitees `.env.local`.
6. **Desarrollo**
   ```bash
   pnpm dev
   ```

Otros comandos: `pnpm build` · `pnpm lint` / `pnpm lint:fix` · `pnpm typecheck` ·
`pnpm seed:generate` (regenera el seed desde `content/`) · `pnpm db:types` (regenera
`src/types/supabase.ts`).

## Deploy en Vercel

1. Importa el repo en Vercel (framework: Next.js, sin config extra).
2. Define las env vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   en Project → Settings → Environment Variables.
3. Deploy. La anon key es pública por diseño; la seguridad real la aporta RLS.

## ⚠️ Seguridad — léelo antes de invitar usuarios

El login es **por RUT, sin contraseña**: el dispositivo abre una sesión anónima de
Supabase y la RPC `login_with_rut()` la vincula al perfil de ese RUT. Esto hace el
ingreso instantáneo y sincroniza varios dispositivos, pero tiene una limitación honesta:
**cualquier persona que conozca un RUT válido puede entrar a ese perfil** (los RUT son
datos semi-públicos en Chile). Los datos guardados son solo avance de estudio, y RLS
impide ver perfiles ajenos sin conocer su RUT, pero no uses la app para información
sensible. Mitigación futura planificada: PIN corto o magic link por email sobre el mismo
esquema (`profile_auth_links` ya soporta múltiples métodos por perfil).

## Fórmula de progreso

```
pct(item) = (studied + review1 + review2 + questions_done + cases_done) × 20
```

Cinco dimensiones, 20% cada una. Los agregados por especialidad/área son el **promedio**
del pct de todos sus ítems (ítems sin registro cuentan como 0). La fórmula vive en SQL
(`progress_pct()` + vistas `v_*_progress`) y espejada en TS (`src/features/progress`):
cualquier cambio debe hacerse en ambos lados.

## Estructura del repo

```
src/app/               rutas: /login /panel /dashboard /planificador /perfil
src/components/        componentes compartidos (+ /ui de shadcn)
src/features/          auth-rut · content · progress · planner · ai-tutor (futuro)
src/lib/               rut.ts · supabase.ts · utils.ts
src/types/             tipos (supabase.ts es generado)
supabase/              migrations/ + seed.sql
content/               JSON de contenido médico (fuente del seed)
scripts/               generate-seed.mjs
claude-design/         SOLO LECTURA: mockups y guía de estilo (fuente de verdad visual)
.claude/               agentes, skills y hooks de Claude Code (ver abajo)
```

## Roadmap

- **Resto del temario**: cargar las 7 áreas del Perfil EUNACOM 2026 (~1.557 ítems) —
  solo datos (`content/*.json` + seed), cero cambios de código.
- **Refuerzo de identidad**: PIN o magic link opcional.
- **ai-tutor** (`src/features/ai-tutor`, desactivado): tutor y generador de preguntas
  con la API de Claude desde route handlers del backend. **No es parte del MVP**; el
  Agent SDK tampoco.

## Infraestructura .claude/ (desarrollo con Claude Code)

- **Agentes** (`.claude/agents/`): `db-architect` (esquema/migraciones/RLS),
  `ui-builder` (pantallas 1:1 con claude-design/), `supabase-integrator`
  (hooks/queries/auth), `seed-content` (contenido → seed), `qa-reviewer` (revisión
  read-only: typecheck, lint, a11y, responsive).
- **Skills** (`.claude/skills/`): `rut-chileno`, `supabase-patterns`,
  `component-conventions`, `progress-model`.
- **Hooks** (`.claude/settings.json` → `.claude/hooks/*.sh`): typecheck automático al
  editar TS bajo `src/`, guard que bloquea comandos destructivos, contexto de repo al
  iniciar sesión y log de cierre.
- **MCP** (`.mcp.json`): server oficial de Supabase; requiere exportar
  `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` (ver `.env.example`).
