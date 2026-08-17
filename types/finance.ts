/**
 * Tipos do módulo financeiro do painel administrativo.
 *
 * Fonte de dados: public.payments (alimentada pelo webhook do gateway
 * na etapa seguinte) e public.subscriptions. Enquanto não houver
 * pagamentos reais, os indicadores vêm zerados e `hasData` é false —
 * a UI usa isso para exibir estados vazios, nunca valores fictícios.
 */

/** Receita e volume agregados por plano. */
export interface FinanceByPlan {
  slug: string;
  title: string;
  interval: "monthly" | "yearly" | "lifetime" | null;
  revenue_cents: number;
  sales: number;
}

/** Distribuição de assinaturas vigentes por plano. */
export interface FinanceSubsByPlan {
  slug: string;
  title: string;
  interval: "monthly" | "yearly" | "lifetime" | null;
  count: number;
}

/** Plano mais vendido (por número de pagamentos aprovados). */
export interface FinanceBestSeller {
  slug: string;
  title: string;
  sales: number;
}

/** Indicadores da visão geral financeira. */
export interface FinanceOverview {
  revenueMonthCents: number;
  revenueYearCents: number;
  revenueTotalCents: number;
  payingUsers: number;
  avgTicketCents: number;
  subsActive: number;
  usersFree: number;
  usersPremium: number;
  byPlan: FinanceByPlan[];
  subsByPlan: FinanceSubsByPlan[];
  bestSeller: FinanceBestSeller | null;
  /** false enquanto não existir nenhum pagamento aprovado. */
  hasData: boolean;
}

/** Ponto de uma série temporal mensal. */
export interface FinancePoint {
  /** primeiro dia do mês (ISO). */
  bucket: string;
  /** rótulo curto para o eixo (ex.: "jul/26"). */
  label: string;
  value: number;
}

/** Séries usadas pelos gráficos. */
export interface FinanceSeries {
  revenue: FinancePoint[];
  sales: FinancePoint[];
  newSubs: FinancePoint[];
  /** true se qualquer série tem algum valor > 0. */
  hasData: boolean;
}
