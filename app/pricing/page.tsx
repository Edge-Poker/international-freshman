import { Footer } from "@/components/landing/footer";
import { PricingHeader } from "@/components/billing/pricing-header";
import { PlanCard } from "@/components/billing/plan-card";
import { AccountActions } from "@/components/billing/account-actions";
import { BillingStatusBadge } from "@/components/billing/billing-status-badge";
import { accountActionsFor, ctaForPlan, getBillingState, listBillingPlans } from "@/lib/billing";
import { formatDateShort } from "@/lib/format";

export const metadata = {
  title: "Pricing",
  description:
    "Full course, forum and progress tracking for international students. Monthly, yearly or lifetime.",
};

/**
 * Pagina PUBLICA de planos. Precos, descricoes e features vem 100% da
 * tabela plans (nunca fixos no frontend). Para usuario autenticado, os
 * botoes se adaptam ao estado da assinatura (matriz em lib/billing.ts).
 */
export default async function PricingPage() {
  const [plans, state] = await Promise.all([listBillingPlans(), getBillingState()]);
  const accountActions = accountActionsFor(state);

  // qual card marcar como "seu plano": o plano pago vigente, ou o Free
  // quando o usuario autenticado nao tem assinatura ativa
  const paidCurrent =
    state.status === "active" ||
    state.status === "lifetime" ||
    state.status === "pending" ||
    state.status === "canceled"
      ? state.subscription?.plan?.slug ?? null
      : null;
  const currentSlug =
    paidCurrent ?? (state.authenticated && state.tier === "free" ? "free" : null);

  return (
    <div className="bg-radial-accent">
      <PricingHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-5 sm:pb-24 sm:pt-32">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
            Full access
          </p>
          <h1 className="mt-4 font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Choose how you want <span className="text-accent">to get through year one</span>
          </h1>
          <p className="mt-4 text-lg text-dim">
            Every paid plan unlocks the full course, the forum, your notes and
            progress tracking. The only difference is how you pay.
          </p>
        </div>

        {state.authenticated && (
          <div className="card mt-8 flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
            <BillingStatusBadge status={state.status} />
            <p className="text-sm text-dim">
              {state.status === "lifetime" &&
                "You have permanent access. Nothing to do here."}
              {state.status === "active" &&
                `Your ${state.subscription?.plan?.displayName ?? ""} plan is active` +
                  (state.periodEnd
                    ? ` through ${formatDateShort(state.periodEnd)}` +
                      (state.daysLeft !== null ? ` (${state.daysLeft} days)` : "") + "."
                    : ".")}
              {state.status === "pending" &&
                "There is a pending payment on your subscription."}
              {state.status === "canceled" &&
                (state.periodEnd
                  ? `Your subscription was canceled and access lasts through ${formatDateShort(state.periodEnd)}.`
                  : "Your subscription was canceled.")}
              {state.status === "expired" &&
                "Your subscription expired. Subscribe again to restore full access."}
              {state.status === "none" &&
                "You are on the free plan, with the Introduction and Chapter 1 unlocked."}
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              cta={ctaForPlan(plan, state)}
              isCurrent={plan.slug === currentSlug}
            />
          ))}
        </div>

        <AccountActions actions={accountActions} />

        <p className="mt-8 font-mono text-xs text-dim">
          Educational material only — nothing here is legal or immigration advice.
          Always confirm status questions with your international student office.
        </p>
      </main>
      <Footer />
    </div>
  );
}
