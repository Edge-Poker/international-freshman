import { cn } from "@/lib/utils";
import type { BillingStatus } from "@/types/billing";

const STYLE: Record<BillingStatus, string> = {
  active: "border-accent/40 bg-accent/10 text-accent",
  lifetime: "border-gold/50 bg-gold/10 text-gold",
  pending: "border-gold/50 bg-gold/10 text-gold",
  canceled: "border-white/10 bg-white/5 text-dim",
  expired: "border-danger/40 bg-danger/10 text-danger",
  none: "border-white/10 bg-white/5 text-dim",
};

const LABEL: Record<BillingStatus, string> = {
  active: "Active plan",
  lifetime: "Lifetime plan",
  pending: "Pending plan",
  canceled: "Canceled plan",
  expired: "Expired plan",
  none: "No subscription",
};

/** Badge de estado da assinatura, no mesmo padrão visual dos chips da plataforma. */
export function BillingStatusBadge({
  status,
  className,
}: {
  status: BillingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px]",
        STYLE[status],
        className
      )}
    >
      {LABEL[status]}
    </span>
  );
}
