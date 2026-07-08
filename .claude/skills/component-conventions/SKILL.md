---
name: component-conventions
description: Convenciones para crear componentes UI respetando claude-design/, tokens CSS, variantes con cva, estados loading/empty/error, responsive móvil-primero, dark mode y accesibilidad táctil. Úsala antes de crear o refactorizar cualquier componente o pantalla.
---

# Convenciones de componentes

## Fuente de verdad
`claude-design/` (SOLO LECTURA) define el look exacto. Los tokens ya viven en
`src/app/globals.css`. Traduce 1:1; ante duda visual, abre el mockup HTML y compara.

## Tokens, nunca hex
```tsx
// MAL
<div className="bg-[#0ea5e9] text-[#111]">
// BIEN — clases Tailwind v4 derivadas de los tokens --color-* de globals.css
<div className="bg-primary text-primary-foreground">
```
Dark mode via clase `.dark` (next-themes): los tokens ya se redefinen ahí; no escribas
`dark:` con colores custom salvo que el diseño lo pida explícitamente.

## Variantes con cva
```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const kpiCardVariants = cva(
  "rounded-xl border bg-card p-4 text-card-foreground",
  {
    variants: {
      tone: { default: "", success: "border-success/40", warning: "border-warning/40" },
      size: { sm: "p-3", md: "p-4" },
    },
    defaultVariants: { tone: "default", size: "md" },
  },
);

export function KpiCard({ className, tone, size, ...props }:
  React.ComponentProps<"div"> & VariantProps<typeof kpiCardVariants>) {
  return <div className={cn(kpiCardVariants({ tone, size }), className)} {...props} />;
}
```

## Estados obligatorios (toda pantalla/lista)
- **Loading**: `Skeleton` con la misma silueta que el contenido real (evita saltos).
- **Empty**: mensaje en español + acción sugerida (p.ej. "Aún no registras avance.
  Marca tu primer ítem en el Panel.").
- **Error**: mensaje claro + botón "Reintentar" que llama `refetch()`.

## Responsive móvil-primero
- Base = ~390px, una mano. Breakpoint clave: `sm` (640px).
- Overlays: bottom sheet en <640px, `Dialog` centrado en desktop (patrón
  `ItemDetailSheet` / `FilterSheet`).
- Navegación: `BottomNav` fija abajo en móvil; `Sidebar` en desktop.

## Accesibilidad
- Targets táctiles **≥44px**: mínimo `min-h-11` (44px) en botones/chips/filas tocables;
  si el icono es chico, agranda el área tocable, no el icono.
- Contraste AA; `aria-label` en botones de solo-icono; `aria-expanded`/`aria-controls`
  en accordions y sheets; foco visible (`focus-visible:ring-*`).

## Animación de progreso
Las barras se llenan con `transition-[width] duration-500` (el ancho cambia por el
optimistic update — ver skill `supabase-patterns`). `ProgressRing` anima
`stroke-dashoffset` con la misma duración.

## Checklist final
- [ ] Sin hex/rgb hardcodeado · [ ] estados loading/empty/error · [ ] ≥44px
- [ ] Se ve bien en 390px y 1280px · [ ] dark mode OK · [ ] textos UI en español
