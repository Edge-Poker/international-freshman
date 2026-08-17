/**
 * Finance service — camada ÚNICA da lógica financeira.
 *
 * Nenhuma página monta consulta ou faz conta: tudo passa por aqui, e
 * as agregações acontecem no banco (RPCs `security definer` da
 * migration 0020, que revalidam is_admin). Mesmo padrão de
 * lib/admin.ts, lib/access.ts e lib/subscriptions.ts.
 *
 * Fonte da receita: public.payments com status 'approved'. Enquanto o
 * gateway não estiver integrado a tabela fica vazia, os indicadores
 * vêm zerados e `hasData` é false — a UI mostra estado vazio. Nenhum
 * dado é simulado em momento algum.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  FinanceOverview,
  FinancePoint,
  FinanceSeries,
  FinanceByPlan,
  FinanceSubsByPlan,
  FinanceBestSeller,
} from "@/types/finance";

type DB = Awaited<ReturnType<typeof createClient>>;

async function db(client?: DB): Promise<DB> {
  return client ?? (await createClient());
}

/** Overview vazio — usado quando a RPC falha ou não há dados. */
const OVERVIEW_VAZIO: FinanceOverview = {
  revenueMonthCents: 0,
  revenueYearCents: 0,
  revenueTotalCents: 0,
  payingUsers: 0,
  avgTicketCents: 0,
  subsActive: 0,
  usersFree: 0,
  usersPremium: 0,
  byPlan: [],
  subsByPlan: [],
  bestSeller: null,
  hasData: false,
};

/** Rótulo curto do mês para os eixos dos gráficos (ex.: "jul/26"). */
function rotuloMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const ano = String(d.getFullYear()).slice(2);
  return `${mes}/${ano}`;
}

/**
 * Indicadores da visão geral: receita (mês, 12 meses, total), ticket
 * médio, assinaturas ativas, usuários free/premium, receita e vendas
 * por plano, distribuição de assinaturas e plano mais vendido.
 * Uma única chamada ao banco.
 */
export async function getFinanceOverview(client?: DB): Promise<FinanceOverview> {
  const supabase = await db(client);
  const { data, error } = await supabase.rpc("admin_finance_overview");
  if (error || !data) return OVERVIEW_VAZIO;

  const d = data as Record<string, unknown>;
  const num = (k: string) => Number(d[k] ?? 0);

  return {
    revenueMonthCents: num("revenue_month_cents"),
    revenueYearCents: num("revenue_year_cents"),
    revenueTotalCents: num("revenue_total_cents"),
    payingUsers: num("paying_users"),
    avgTicketCents: num("avg_ticket_cents"),
    subsActive: num("subs_active"),
    usersFree: num("users_free"),
    usersPremium: num("users_premium"),
    byPlan: ((d.by_plan as FinanceByPlan[]) ?? []).map((p) => ({
      ...p,
      revenue_cents: Number(p.revenue_cents ?? 0),
      sales: Number(p.sales ?? 0),
    })),
    subsByPlan: ((d.subs_by_plan as FinanceSubsByPlan[]) ?? []).map((p) => ({
      ...p,
      count: Number(p.count ?? 0),
    })),
    bestSeller: (d.best_seller as FinanceBestSeller | null) ?? null,
    hasData: Boolean(d.has_data),
  };
}

/**
 * Séries mensais para os gráficos: receita ao longo do tempo, número
 * de vendas e novas assinaturas. Os meses sem movimento vêm zerados
 * (não faltando), para o gráfico não ter buracos.
 */
export async function getFinanceSeries(
  months = 12,
  client?: DB
): Promise<FinanceSeries> {
  const supabase = await db(client);

  const [{ data: rev }, { data: subs }] = await Promise.all([
    supabase.rpc("admin_finance_revenue_series", { p_months: months }),
    supabase.rpc("admin_finance_new_subs_series", { p_months: months }),
  ]);

  const linhasRev = (rev as { bucket: string; revenue_cents: number; sales: number }[]) ?? [];
  const linhasSubs = (subs as { bucket: string; novas: number }[]) ?? [];

  const revenue: FinancePoint[] = linhasRev.map((r) => ({
    bucket: r.bucket,
    label: rotuloMes(r.bucket),
    value: Number(r.revenue_cents ?? 0),
  }));
  const sales: FinancePoint[] = linhasRev.map((r) => ({
    bucket: r.bucket,
    label: rotuloMes(r.bucket),
    value: Number(r.sales ?? 0),
  }));
  const newSubs: FinancePoint[] = linhasSubs.map((r) => ({
    bucket: r.bucket,
    label: rotuloMes(r.bucket),
    value: Number(r.novas ?? 0),
  }));

  const hasData =
    revenue.some((p) => p.value > 0) ||
    sales.some((p) => p.value > 0) ||
    newSubs.some((p) => p.value > 0);

  return { revenue, sales, newSubs, hasData };
}

/**
 * Carrega tudo o que o dashboard financeiro precisa, em paralelo.
 * A página chama só isto.
 */
export async function getFinanceDashboard(months = 12, client?: DB) {
  const supabase = await db(client);
  const [overview, series] = await Promise.all([
    getFinanceOverview(supabase),
    getFinanceSeries(months, supabase),
  ]);
  return { overview, series };
}
