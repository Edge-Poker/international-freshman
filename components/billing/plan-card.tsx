import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { PlanCta } from "@/components/billing/plan-cta";
import type { BillingPlan, PlanCta as PlanCtaDescriptor } from "@/types/billing";

/** Sufixo de preco por periodicidade. O gratuito nao tem periodicidade. */
function priceSuffix(plan: BillingPlan) {
  if (plan.slug === "free") return "";
  if (plan.interval === "monthly") return "/mo";
  if (plan.interval === "yearly") return "/yr";
  return " once";
}

/**
 * Card de plano da página pública. Mesmo desenho da seção de planos da
 * landing (card p-8, destaque com borda accent e glow), com preço,
 * descrição e features vindos 100% da tabela plans.
 */
export function PlanCard({
  plan,
  cta,
  isCurrent,
}: {
  plan: BillingPlan;
  cta: PlanCtaDescriptor;
  isCurrent: boolean;
}) {
  return (
    <div
      className={cn(
        "card relative flex flex-col p-8 transition-transform hover:-translate-y-1",
        plan.highlighted && "border-accent/50 shadow-glow"
      )}
    >
      <div className="flex items-center gap-2">
        {plan.highlighted && (
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
            Best value
          </span>
        )}
        {isCurrent && (
          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-dim">
            Your plan
          </span>
        )}
      </div>

      <h3 className={cn("text-lg font-bold", (plan.highlighted || isCurrent) && "mt-3")}>
        {plan.displayName}
      </h3>

      <p className="mt-2 font-display text-3xl font-black sm:text-4xl">
        {formatMoney(plan.price_cents)}
        <span className="ml-1 font-sans text-base font-normal text-dim">
          {priceSuffix(plan)}
        </span>
      </p>
      {plan.interval === "yearly" && (
        <p className="mt-1 font-mono text-xs text-accent">
          works out to {formatMoney(Math.round(plan.price_cents / 12))}/mo
        </p>
      )}

      {plan.description && <p className="mt-3 text-sm text-dim">{plan.description}</p>}

      <ul className="mt-5 flex-1 space-y-2 text-sm text-dim">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <PlanCta
          planSlug={plan.slug}
          intent={cta.intent}
          label={cta.label}
          disabled={cta.disabled}
          highlighted={plan.highlighted}
          note={cta.note}
        />
      </div>
    </div>
  );
}
