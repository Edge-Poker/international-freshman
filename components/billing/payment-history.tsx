import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatDateShort } from "@/lib/format";
import type { BillingHistory, PaymentStatus } from "@/types/billing";

const STATUS_STYLE: Record<PaymentStatus, string> = {
  approved: "border-accent/40 bg-accent/10 text-accent",
  pending: "border-gold/50 bg-gold/10 text-gold",
  rejected: "border-danger/40 bg-danger/10 text-danger",
  refunded: "border-white/10 bg-white/5 text-dim",
  chargeback: "border-danger/40 bg-danger/10 text-danger",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Declined",
  refunded: "Refunded",
  chargeback: "Chargeback",
};

/**
 * Histórico de pagamentos. Nesta etapa a tabela payments existe e está
 * vazia (nenhum emissor grava nela até a integração do gateway); a
 * lista já renderiza registros reais assim que passarem a existir.
 */
export function PaymentHistory({ entries }: { entries: BillingHistory }) {
  return (
    <section className="card mt-6 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-black">
        <Receipt className="h-5 w-5 text-accent" /> Payment history
      </h2>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-dim">Nenhum pagamento registrado.</p>
          <p className="mt-1 font-mono text-[11px] text-dim">
            Os pagamentos aparecem aqui automaticamente assim que forem habilitados.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {entries.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-24 shrink-0 font-mono text-xs text-dim">
                {formatDateShort(p.paid_at ?? p.created_at)}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                {p.plan_slug ? `Plan: ${p.plan_slug}` : "Payment"}
                {p.provider && (
                  <span className="ml-2 font-mono text-[11px] text-dim">
                    via {p.provider}
                  </span>
                )}
              </span>
              <span className="font-mono text-sm tabular-nums">
                {formatMoney(p.amount_cents)}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-[11px]",
                  STATUS_STYLE[p.status]
                )}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
