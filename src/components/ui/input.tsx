import * as React from "react";
import { cn } from "@/lib/utils";
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => <input ref={ref} className={cn("flex h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-card-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:opacity-50", className)} {...props} />);
Input.displayName = "Input";
