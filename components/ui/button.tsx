import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-ink-950 font-semibold shadow-glow-sm hover:shadow-glow hover:brightness-110",
  ghost:
    "border border-white/10 text-white hover:border-accent/50 hover:text-accent",
  danger: "bg-danger text-white hover:brightness-110",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition-all disabled:opacity-50",
      styles[variant],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";
