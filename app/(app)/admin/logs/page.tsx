import Link from "next/link";
import { listLogs, ADMIN_LOGS_PAGE_SIZE } from "@/lib/admin";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { FilterPills, FlagBadge, Pagination } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Admin · Logs" };

const EVENTOS = [
  { value: "todos", label: "Todos" },
  { value: "login", label: "Login" },
  { value: "cadastro", label: "Cadastro" },
  { value: "alteracao_plano", label: "Plano" },
  { value: "banimento", label: "Banimento" },
  { value: "silenciamento", label: "Silenciamento" },
  { value: "conteudo_excluido", label: "Content deletion" },
  { value: "conta_excluida", label: "Account deleted" },
];

const LABEL: Record<string, string> = {
  login: "Login",
  cadastro: "Cadastro",
  alteracao_plano: "Plan change",
  assinatura_ativada: "Subscription activated",
  assinatura_renovada: "Subscription renewed",
  assinatura_cancelada: "Subscription canceled",
  assinatura_expirada: "Subscription expired",
  banimento: "Banimento",
  desbanimento: "Desbanimento",
  silenciamento: "Silenciamento",
  remocao_silencio: "Silence removed",
  conta_excluida: "Account deleted",
  progresso_resetado: "Progress reset",
  conteudo_excluido: "Content deleted",
  topico_fixado: "Topic pinned",
  topico_destacado: "Topic highlighted",
  topico_sem_destaque: "Highlight removed",
  topico_fechado: "Discussion closed",
  topico_reaberto: "Discussion reopened",
  denuncia_resolvida: "Report resolved",
  denuncia_reaberta: "Report reopened",
  pagamento_aprovado: "Payment approved",
  pagamento_recusado: "Payment declined",
};

function tone(event: string): "accent" | "gold" | "danger" | "dim" {
  if (["banimento", "conta_excluida", "conteudo_excluido", "pagamento_recusado",
       "assinatura_expirada", "topico_fechado"].includes(event)) return "danger";
  if (["alteracao_plano", "silenciamento", "assinatura_cancelada",
       "progresso_resetado", "topico_destacado"].includes(event)) return "gold";
  if (["cadastro", "assinatura_ativada", "assinatura_renovada", "pagamento_aprovado",
       "desbanimento", "remocao_silencio", "denuncia_resolvida"].includes(event)) return "accent";
  return "dim";
}

/** Resumo legível dos detalhes mais comuns (sem despejar JSON cru). */
function resumo(l: { event: string; details: Record<string, unknown> }) {
  const d = l.details ?? {};
  const partes: string[] = [];
  if (l.event === "alteracao_plano" && (d.de || d.para)) partes.push(`${d.de ?? "?"} → ${d.para ?? "?"}`);
  if (typeof d.plano === "string") partes.push(`plano ${d.plano}`);
  if (typeof d.email === "string") partes.push(String(d.email));
  if (typeof d.titulo === "string" && d.titulo) partes.push(`“${String(d.titulo).slice(0, 60)}”`);
  if (typeof d.trecho === "string" && d.trecho) partes.push(`“${String(d.trecho).slice(0, 60)}...”`);
  if (typeof d.nickname === "string" && d.nickname) partes.push(`@${d.nickname}`);
  if (d.imediato === true) partes.push("imediato");
  return partes.join(" · ");
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; evento?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const evento = EVENTOS.some((e) => e.value === sp.evento) ? sp.evento! : "todos";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const { rows, total } = await listLogs({ search: sp.q, event: evento, page: pagina });
  const params = { q: sp.q, evento: sp.evento };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-black">Audit logs</h2>
          <p className="mt-1 text-sm text-dim">
            {total} event{total === 1 ? "" : "s"} · logins, signups, admin actions
            and payment events.
          </p>
        </div>
        <AdminSearchBar placeholder="Search by event, user or detail..." />
      </div>

      <div className="mt-5">
        <FilterPills basePath="/admin/logs" param="evento"
          options={EVENTOS} current={evento} params={params} />
      </div>

      <ul className="mt-6 grid gap-2">
        {rows.map((l) => {
          const detalhes = resumo(l);
          return (
            <li key={l.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-32 shrink-0 font-mono text-[11px] text-dim">
                {formatDateTime(l.created_at)}
              </span>
              <FlagBadge tone={tone(l.event)}>{LABEL[l.event] ?? l.event}</FlagBadge>
              <span className="min-w-0 flex-1 truncate text-sm">
                {l.actor_id && (
                  <Link href={`/admin/users/${l.actor_id}`}
                    className="font-mono text-xs text-accent hover:brightness-125">
                    {l.actor_nickname ? `@${l.actor_nickname}` : l.actor_name ?? "sistema"}
                  </Link>
                )}
                {l.target_user_id && l.target_user_id !== l.actor_id && (
                  <>
                    <span className="mx-1.5 text-dim">→</span>
                    <Link href={`/admin/users/${l.target_user_id}`}
                      className="font-mono text-xs text-gold hover:brightness-125">
                      {l.target_nickname ? `@${l.target_nickname}` : l.target_name ?? "user"}
                    </Link>
                  </>
                )}
                {detalhes && <span className="ml-2 text-xs text-dim">{detalhes}</span>}
              </span>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="card p-10 text-center text-sm text-dim">
            No events recorded yet. Logins, signups and admin actions
            administrativas passam a aparecer aqui automaticamente.
          </li>
        )}
      </ul>

      <Pagination basePath="/admin/logs" page={pagina} total={total}
        pageSize={ADMIN_LOGS_PAGE_SIZE} params={params} />
    </div>
  );
}
