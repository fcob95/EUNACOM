# TAREAS FRANCISCO

## [ ] Crear proyecto Supabase y habilitar auth anónima
**Para qué**: sin esto el login por RUT no funciona (la app depende de sesiones
anónimas + la RPC `login_with_rut`).
**Pasos**:
1. Crea un proyecto en https://supabase.com (si no existe ya uno para EunaTrack).
2. Dashboard → **Authentication → Providers → Anonymous sign-ins** → **Enable**.
3. Dashboard → **SQL Editor**: pega y ejecuta `supabase/migrations/0001_init.sql`,
   luego `supabase/seed.sql` (o `supabase db push` + `supabase db reset` si usas CLI).
**Resultado esperado**: en **Authentication → Providers** el toggle "Anonymous
sign-ins" queda en verde/activo; las tablas `areas`, `specialties`, `items`, etc.
aparecen en **Table Editor** con datos de Medicina Interna.

## [ ] Configurar variables de entorno locales
**Para qué**: sin esto `pnpm dev` corre pero el login muestra "Falta configurar
Supabase".
**Pasos**:
1. Copia `.env.example` → `.env.local`.
2. En el dashboard de Supabase: **Project Settings → API**, copia `Project URL` y
   `anon public key`.
3. Pega esos valores en `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   dentro de `.env.local`.
**Resultado esperado**: `pnpm dev` levanta y `/login` deja ingresar un RUT válido
sin el aviso de configuración faltante.

## [ ] Exportar credenciales para el MCP de Supabase
**Para qué**: los subagentes `db-architect` y `supabase-integrator` usan el MCP
oficial de Supabase (`.mcp.json`) para leer/modificar el esquema desde Claude Code.
**Pasos**:
1. Genera un access token personal en https://supabase.com/dashboard/account/tokens.
2. Copia el `project ref` desde **Project Settings → General → Reference ID**.
3. Exporta ambos en tu shell antes de abrir Claude Code en este proyecto:
   ```bash
   export SUPABASE_ACCESS_TOKEN=<token>
   export SUPABASE_PROJECT_REF=<ref>
   ```
**Resultado esperado**: los subagentes que usan el MCP de Supabase pueden listar
tablas/ejecutar queries sin error de autenticación.

## [ ] Deploy en Vercel
**Para qué**: publicar la app para uso real desde el teléfono.
**Pasos**:
1. Importa el repo `fcob95/EUNACOM` en https://vercel.com/new (framework: Next.js,
   sin config extra).
2. En **Project → Settings → Environment Variables**, agrega
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mismos valores que
   `.env.local`).
3. Deploy.
**Resultado esperado**: la URL de Vercel carga `/login` y el login por RUT funciona
igual que en local.
