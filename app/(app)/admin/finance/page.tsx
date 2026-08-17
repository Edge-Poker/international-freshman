import {
  Banknote, CalendarRange, Wallet, Users, Crown, Receipt,
  TrendingUp, PieChart, LineChart as LineIcon, Trophy,
} from "lucide-react";
import { getFinanceDashboard } from "@/lib/finance";
import { StatCard } from "@/components/admin/ui";
import {
  LineChart, BarChart, DonutChart, FinanceEmpty,
} from "@/components/admin/finance-charts";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Admin · Finance" };

/**
 * Dashboard financeiro. Toda consulta e agregação vive em lib/finance.ts
 * (que fala com as RPCs da migration 0020) — esta página só organiza a
 * apresentação. Sem gateway integrado, os números vêm zerados e os
 * blocos exibem estados vazios; nada é simulado.
 */
export default async function AdminFinanceiroPage() {
  const { overview: o, series } = await getFinanceDashboard(12);

  const receitaPorPlano = o.byPlan.map((p) => ({
    label: p.title,
    value: p.revenue_cents,
  }));
  const distribuicao = o.subsByPlan.map((p) => ({
    label: p.title,
    value: p.count,
  }));

  return (
    <div>
      {/* aviso enquanto não há pagamentos */}
      {!o.hasData && (
        <div className="card mb-8 flex items-start gap-4 border-accent/25 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <Receipt className="h-5 w-5 text-accent" />
          </span>
          <div>
            <p className="font-semibold">No financial data available</p>
            <p className="mt-1 text-sm text-dim">
              This area is wired up and ready. Once the payment gateway
              is integrated, revenue, charts and indicators will start
              ser preenchidos automaticamente a cada pagamento aprovado.
            </p>
          </div>
        </div>
      )}

      {/* receita */}
      <h2 className="font-display text-xl font-black">Receita</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Banknote className="h-5 w-5 text-accent" />}
          label="Monthly revenue" value={formatMoney(o.revenueMonthCents)}
          sub="received this month" />
        <StatCard icon={<CalendarRange className="h-5 w-5 text-accent" />}
          label="Yearly revenue" value={formatMoney(o.revenueYearCents)}
          sub="last 12 months" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-gold" />} accent="gold"
          label="Total revenue" value={formatMoney(o.revenueTotalCents)}
          sub="since launch" />
        <StatCard icon={<Receipt className="h-5 w-5 text-gold" />} accent="gold"
          label="Average ticket" value={formatMoney(o.avgTicketCents)}
          sub={`${o.payingUsers} pagante${o.payingUsers === 1 ? "" : "s"}`} />
      </div>

      {/* base de usuários e assinaturas */}
      <h2 className="mt-10 font-display text-xl font-black">Base</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet className="h-5 w-5 text-accent" />}
          label="Active subscriptions" value={o.subsActive} sub="current right now" />
        <StatCard icon={<Users className="h-5 w-5 text-dim" />} accent="dim"
          label="Free users" value={o.usersFree} sub="sem assinatura" />
        <StatCard icon={<Crown className="h-5 w-5 text-gold" />} accent="gold"
          label="Premium users" value={o.usersPremium} sub="com acesso pago" />
        <StatCard icon={<Trophy className="h-5 w-5 text-accent" />}
          label="Best-selling plan"
          value={o.bestSeller ? o.bestSeller.title : "—"}
          sub={o.bestSeller ? `${o.bestSeller.sales} venda${o.bestSeller.sales === 1 ? "" : "s"}` : "sem vendas registradas"} />
      </div>

      {/* gráficos */}
      <h2 className="mt-10 font-display text-xl font-black">Trend</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <LineIcon className="h-4 w-4 text-accent" /> Receita ao longo do tempo
          </h3>
          <p className="mb-4 mt-0.5 font-mono text-[11px] text-dim">last 12 months</p>
          {series.revenue.some((p) => p.value > 0)
            ? <LineChart points={series.revenue} money />
            : <FinanceEmpty />}
        </section>

        <section className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-accent" /> New subscriptions over time
          </h3>
          <p className="mb-4 mt-0.5 font-mono text-[11px] text-dim">last 12 months</p>
          {series.newSubs.some((p) => p.value > 0)
            ? <LineChart points={series.newSubs} color="#C9A85C" />
            : <FinanceEmpty message="New subscriptions will show up here as they are created." />}
        </section>

        <section className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-accent" /> Receita por plano
          </h3>
          <p className="mb-4 mt-0.5 font-mono text-[11px] text-dim">monthly, yearly and lifetime</p>
          {receitaPorPlano.length > 0
            ? <BarChart items={receitaPorPlano} />
            : <FinanceEmpty message="Revenue by plan appears after the first payments." />}
        </section>

        <section className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PieChart className="h-4 w-4 text-accent" /> Plan distribution
          </h3>
          <p className="mb-4 mt-0.5 font-mono text-[11px] text-dim">assinaturas vigentes</p>
          <DonutChart items={distribuicao} />
        </section>
      </div>
    </div>
  );
}
