import Link from "next/link";
import { listUsers, ADMIN_PAGE_SIZE } from "@/lib/admin";
import type { AdminUserPlanFilter, AdminUserStatusFilter } from "@/types/admin";
import { Avatar } from "@/components/profile/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { FilterPills, FlagBadge, Pagination, PlanBadge, SubStatusBadge } from "@/components/admin/ui";
import { formatDateShort, timeAgoShort } from "@/lib/format";

export const metadata = { title: "Admin · Users" };

const STATUS: { value: AdminUserStatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Active" },
  { value: "pendentes", label: "Pending" },
  { value: "banidos", label: "Banidos" },
  { value: "silenciados", label: "Silenciados" },
];
const PLANOS: { value: AdminUserPlanFilter; label: string }[] = [
  { value: "todos", label: "Any plan" },
  { value: "mensal", label: "Monthly" },
  { value: "anual", label: "Yearly" },
  { value: "vitalicio", label: "Lifetime" },
];

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plano?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const status = (STATUS.some((s) => s.value === sp.status) ? sp.status : "todos") as AdminUserStatusFilter;
  const plano = (PLANOS.some((p) => p.value === sp.plano) ? sp.plano : "todos") as AdminUserPlanFilter;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const { rows, total } = await listUsers({ search: sp.q, status, plan: plano, page: pagina });
  const params = { q: sp.q, status: sp.status, plano: sp.plano };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-black">Users</h2>
          <p className="mt-1 text-sm text-dim">
            {total} account{total === 1 ? "" : "s"} · click to open details and actions.
          </p>
        </div>
        <AdminSearchBar placeholder="Search by name or email..." />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <FilterPills basePath="/admin/users" param="status" options={STATUS} current={status} params={params} />
        <FilterPills basePath="/admin/users" param="plano" options={PLANOS} current={plano} params={params} />
      </div>

      {/* tabela (desktop) */}
      <div className="card mt-6 hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 font-mono text-[11px] uppercase tracking-wider text-dim">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Posts</th>
              <th className="px-4 py-3 text-right">Coment.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                    <Avatar url={u.avatar_url} name={u.nickname ?? u.name} size="sm" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent">
                        <span className="truncate">{u.nickname ? `@${u.nickname}` : u.name ?? "sem nome"}</span>
                        {u.is_admin && <VerifiedBadge />}
                      </span>
                      <span className="block truncate text-xs text-dim">{u.email ?? "—"}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1">
                    {u.is_banned && <FlagBadge tone="danger">banido</FlagBadge>}
                    {u.is_silenced && <FlagBadge tone="gold">silenciado</FlagBadge>}
                    {!u.is_banned && !u.is_silenced && (
                      <SubStatusBadge status={u.sub_status ?? (u.plan === "free" ? null : "active")} grants={u.plan !== "free"} />
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-dim">{formatDateShort(u.created_at)}</td>
                <td className="px-4 py-3 font-mono text-xs text-dim">{timeAgoShort(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{u.posts_count}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{u.comments_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-dim">No users match these filters.</p>
        )}
      </div>

      {/* cards (mobile) */}
      <ul className="mt-6 grid gap-3 lg:hidden">
        {rows.map((u) => (
          <li key={u.id}>
            <Link href={`/admin/users/${u.id}`}
              className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/40">
              <Avatar url={u.avatar_url} name={u.nickname ?? u.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent">
                  <span className="truncate">{u.nickname ? `@${u.nickname}` : u.name ?? "sem nome"}</span>
                  {u.is_admin && <VerifiedBadge />}
                </span>
                <span className="block truncate text-xs text-dim">{u.email ?? "—"}</span>
                <span className="mt-1.5 flex flex-wrap gap-1">
                  <PlanBadge plan={u.plan} />
                  {u.is_banned && <FlagBadge tone="danger">banido</FlagBadge>}
                  {u.is_silenced && <FlagBadge tone="gold">silenciado</FlagBadge>}
                </span>
              </span>
              <span className="shrink-0 text-right font-mono text-[10px] text-dim">
                {timeAgoShort(u.last_sign_in_at)}
                <span className="block">{u.posts_count} posts</span>
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="card p-10 text-center text-sm text-dim">
            No users match these filters.
          </li>
        )}
      </ul>

      <Pagination basePath="/admin/users" page={pagina} total={total}
        pageSize={ADMIN_PAGE_SIZE} params={params} />
    </div>
  );
}
