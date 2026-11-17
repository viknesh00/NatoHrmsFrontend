import * as React from "react";
import { cn } from "cn";

// Native shadcn select for forms that rely on browser change events.
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(function NativeSelect({ className, ...props }: React.ComponentProps<"select">, ref) {
  return <select ref={ref} data-slot="native-select" className={cn("h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
});
export { NativeSelect };
