import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selo azul de conta oficial (administradores da plataforma). */
export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span title="Conta oficial da plataforma" aria-label="Conta oficial da plataforma">
      <BadgeCheck
        className={cn(
          size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6",
          "text-sky-400"
        )}
        fill="rgba(56,189,248,0.25)"
      />
    </span>
  );
}
