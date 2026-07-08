import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:opacity-90",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-border",
        ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
        outline:
          "border border-border bg-surface text-foreground hover:bg-surface-2",
        destructive: "bg-domain-1 text-white hover:opacity-90",
      },
      size: {
        default: "h-11 px-5", // 44px: target táctil mínimo
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
