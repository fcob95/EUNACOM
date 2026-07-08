"use client";

/**
 * ResponsiveSheet: bottom sheet en móvil (<640px) y dialog centrado en
 * desktop — el patrón del diseño para ItemDetailSheet y FilterSheet.
 * Un solo Radix Dialog cuyo Content cambia de layout con clases sm:.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          // móvil: bottom sheet
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl bg-surface shadow-sheet data-[state=open]:animate-slide-up",
          // desktop: dialog centrado 580px
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-[580px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      >
        {/* handle del bottom sheet (solo móvil) */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-track sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-1 sm:pt-5">
          <div>
            <DialogPrimitive.Title className="text-base font-extrabold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {title}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="pressable -mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-faint hover:bg-surface-2 hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
