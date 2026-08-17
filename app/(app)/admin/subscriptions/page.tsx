import Link from "next/link";
import { listSubscriptions, ADMIN_PAGE_SIZE } from "@/lib/admin";
import type { AdminSubscriptionFilter } from "@/types/admin";
import { Avatar } from "@/components/profile/avatar";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { FilterPills, FlagBadge, Pagination, PlanBadge, SubStatusBadge } from "@/components/admin/ui";
import { formatDateShort } from "@/lib/format";

export const metadata = { title: "Admin · Subscriptions" };

const FILTROS: { value: AdminSubscriptionFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "ativas", label: "Active" },
  { value: "pendentes", label: "Pending" },
  { value: "canceladas", label: "Canceled" },
  { value: "expiradas", label: "Expired" },
  { value: "vitalicias", label: "Lifetime" },
];

export default async function AdminAssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const status = (FILTROS.some((f) => f.value === sp.status) ? sp.status : "todas") as AdminSubscriptionFilter;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const { rows, total } = await listSubscriptions({ search: sp.q, status, page: pagina });
  const params = { q: sp.q, status: sp.status };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-black">Assinaturas</h2>
          <p className="mt-1 text-sm text-dim">
            {total} registro{total === 1 ? "" : "s"} · fonte de verdade: tabela subscriptions.
          </p>
        </div>
        <AdminSearchBar placeholder="User, email or provider ID..." />
      </div>

      <div className="mt-5">
        <FilterPills basePath="/admin/subscriptions" param="status"
          options={FILTROS} current={status} params={params} />
      </div>

      <ul className="mt-6 grid gap-3">
        {rows.map((s) => (
          <li key={s.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/admin/users/${s.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar url={s.user_avatar_url} name={s.user_nickname ?? s.user_name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold text-accent">
                    {s.user_nickname ? `@${s.user_nickname}` : s.user_name ?? "sem nome"}
                  </span>
                  <span className="block truncate text-xs text-dim">{s.user_email ?? "—"}</span>
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-1.5">
                <PlanBadge plan={s.plan_slug} />
                <SubStatusBadge status={s.status} grants={s.grants_access} />
                {s.cancel_at_period_end && <FlagBadge tone="gold">cancels at period end</FlagBadge>}
              </div>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-white/5 pt-3 font-mono text-[11px] text-dim sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="uppercase tracking-wider">Start</dt>
                <dd className="mt-0.5 text-white">{formatDateShort(s.started_at)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider">Vencimento</dt>
                <dd className="mt-0.5 text-white">
                  {s.plan_interval === "lifetime" ? "never expires" : formatDateShort(s.period_end)}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider">Provider</dt>
                <dd className="mt-0.5 text-white">{s.provider ?? "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="uppercase tracking-wider">Provider Subscription ID</dt>
                <dd className="mt-0.5 truncate text-white" title={s.provider_subscription_id ?? undefined}>
                  {s.provider_subscription_id ?? "—"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="uppercase tracking-wider">Provider Customer ID</dt>
                <dd className="mt-0.5 truncate text-white" title={s.provider_customer_id ?? undefined}>
                  {s.provider_customer_id ?? "—"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="card p-10 text-center text-sm text-dim">
            Nenhuma assinatura encontrada com esses filtros. Quando o Mercado Pago
            is integrated, gateway records will appear here.
          </li>
        )}
      </ul>

      <Pagination basePath="/admin/subscriptions" page={pagina} total={total}
        pageSize={ADMIN_PAGE_SIZE} params={params} />
    </div>
  );
}
