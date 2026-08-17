import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo da marca, que volta para a home. Como botao, ganha destaque sutil
 * e uma animacao no hover: sobe de leve, o "." pisca em glow e um traco
 * cresce embaixo — deixando claro que e clicavel.
 *
 * O nome vive so aqui: para rebatizar a plataforma inteira, troque a
 * constante BRAND (e o metadata em app/layout.tsx).
 */
export const BRAND = "FRESHMAN";

export function BrandLogo({
  href = "/",
  size = "md",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sz = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  return (
    <Link
      href={href}
      aria-label="Back to home"
      className={cn(
        "group relative inline-flex items-center font-display font-black tracking-tight transition-all duration-200 hover:-translate-y-0.5",
        sz,
        className
      )}
    >
      <span className="transition-colors duration-200 group-hover:text-white">{BRAND}</span>
      <span className="text-accent transition-all duration-200 group-hover:[text-shadow:0_0_12px_rgba(59,158,255,0.9)]">
        .
      </span>
      {/* traco que cresce no hover */}
      <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-accent shadow-glow-sm transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}
