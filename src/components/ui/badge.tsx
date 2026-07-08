import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-muted",
        primary: "border-transparent bg-primary-soft text-primary-text",
        outline: "border-border bg-transparent text-faint",
        exam: "border-transparent bg-surface-2 text-muted uppercase tracking-wider",
      },
      size: {
        default: "px-2.5 py-0.5 text-[11px]",
        sm: "px-2 py-px text-[10.5px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
