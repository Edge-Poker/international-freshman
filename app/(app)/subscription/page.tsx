import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingStatusBadge } from "@/components/billing/billing-status-badge";
import { SubscriptionActions } from "@/components/billing/subscription-actions";
import { PaymentHistory } from "@/components/billing/payment-history";
import { getBillingState, getPaymentHistory } from "@/lib/billing";
import { formatDateShort, formatDateTime } from "@/lib/format";

export const metadata = { title: "My subscription" };

/** Valor com fallback padrao para dado ainda inexistente. */
function Value({ children }: { children?: React.ReactNode }) {
  return children ? (
    <>{children}</>
  ) : (
    <span className="text-dim">Not available yet</span>
  );
}

function Info({ label, children, mono }: {
  label: string;
  children?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">{label}</dt>
      <dd className={mono ? "mt-1 break-all font-mono text-xs" : "mt-1 text-sm"}>
        <Value>{children}</Value>
      </dd>
    </div>
  );
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { pagamento } = await searchParams;
  const [state, history] = await Promise.all([getBillingState(), getPaymentHistory()]);
  const sub = state.subscription;
  const isLifetime = state.status === "lifetime";
  const managing = state.status === "active" || state.status === "pending" || state.status === "canceled";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      {pagamento && (
        <div
          className={`card mb-6 p-4 ${
            pagamento === "sucesso"
              ? "border-accent/40 bg-accent/10"
              : pagamento === "pendente"
                ? "border-gold/40 bg-gold/10"
                : "border-danger/40 bg-danger/10"
          }`}
        >
          <p className="text-sm">
            {pagamento === "sucesso"
              ? "Payment approved! Your subscription activates as soon as the provider confirms — usually within seconds. If it still shows as pending, refresh in a moment."
              : pagamento === "pendente"
                ? "Your payment is processing. Access is released automatically once it is approved."
                : "The payment was not completed. You can try again whenever you like — nothing was charged."}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
          <CreditCard className="h-7 w-7 text-accent" /> My subscription
        </h1>
        <BillingStatusBadge status={state.status} />
      </div>
      <p className="mt-1 text-dim">
        Your plan details, billing period and payment history.
      </p>

      <section className="card mt-6 p-6">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Info label="Current plan">
            {sub?.plan
              ? `${sub.plan.displayName} (${sub.plan.title})`
              : state.tier === "free"
                ? "Free"
                : undefined}
          </Info>
          <Info label="Status">
            <BillingStatusBadge status={state.status} />
          </Info>
          <Info label="Start date">
            {sub?.started_at ? formatDateShort(sub.started_at) : undefined}
          </Info>
          <Info label="Renewal date">
            {isLifetime
              ? "Never expires (lifetime access)"
              : state.periodEnd
                ? formatDateShort(state.periodEnd)
                : undefined}
          </Info>
          <Info label="Days remaining">
            {isLifetime
              ? "Unlimited"
              : state.daysLeft !== null
                ? `${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"}`
                : undefined}
          </Info>
          <Info label="Last updated">
            {sub?.updated_at ? formatDateTime(sub.updated_at) : undefined}
          </Info>
          <Info label="Provider" mono>{sub?.provider}</Info>
          <Info label="Subscription ID" mono>{sub?.provider_subscription_id}</Info>
          <Info label="Customer ID" mono>{sub?.provider_customer_id}</Info>
        </dl>
      </section>

      {managing && sub?.plan && (
        <section className="card mt-6 p-6">
          <h2 className="font-display text-lg font-black">Manage</h2>
          <p className="mt-1 text-sm text-dim">
            Renew early, switch plans or cancel whenever you want.
          </p>
          <div className="mt-4">
            <SubscriptionActions
              planSlug={sub.plan.slug}
              canRenew={sub.plan.interval === "yearly"}
            />
          </div>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:brightness-125"
          >
            See plans and upgrades <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {!managing && !isLifetime && (
        <section className="card mt-6 p-6 text-center">
          <p className="font-semibold">
            {state.status === "expired"
              ? "Your subscription expired"
              : "You do not have a subscription yet"}
          </p>
          <p className="mt-1 text-sm text-dim">
            Pick a plan to unlock the full course, the forum and progress tracking.
          </p>
          <Link href="/pricing" className="mt-4 inline-block">
            <Button>See plans</Button>
          </Link>
        </section>
      )}

      {isLifetime && (
        <section className="card mt-6 border-gold/30 p-6">
          <p className="font-semibold text-gold">Lifetime access active</p>
          <p className="mt-1 text-sm text-dim">
            You have permanent access to all content, including future updates.
            There is no recurring charge on this plan.
          </p>
        </section>
      )}

      <PaymentHistory entries={history} />
    </main>
  );
}
