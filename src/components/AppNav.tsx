"use client";

/**
 * Navegación: <BottomNav> (móvil, 4 destinos, fixed bottom) y <Sidebar>
 * (tablet: rail 68px solo iconos · desktop ≥lg: 224px con labels).
 * Activo: fondo teal suave + texto teal (tokens primary-soft/primary-text).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  LayoutList,
  PieChart,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/panel", label: "Panel", icon: LayoutList },
  { href: "/dashboard", label: "Dashboard", icon: PieChart },
  { href: "/planificador", label: "Planificador", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  active ? "text-primary-text" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 items-center justify-center rounded-full px-4",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-[68px] flex-col border-r border-border bg-surface md:flex lg:w-56"
    >
      <div className="flex h-16 items-center gap-2.5 px-3.5 lg:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Activity className="size-5 text-white" aria-hidden />
        </span>
        <span className="hidden text-lg font-extrabold tracking-tight lg:block">
          EunaTrack
        </span>
      </div>
      <ul className="flex flex-col gap-1 px-2.5 pt-2 lg:px-3.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-3 rounded-xl px-0 text-sm font-semibold lg:justify-start lg:px-3.5",
                  active
                    ? "bg-primary-soft text-primary-text"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden lg:block">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
