import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-border bg-input-bg px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-faint disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
