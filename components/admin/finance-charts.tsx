import { formatMoney } from "@/lib/format";
import type { FinancePoint } from "@/types/finance";

/**
 * Gráficos do módulo financeiro, em SVG puro.
 *
 * Feitos à mão de propósito: o projeto não usa biblioteca de gráficos,
 * e assim o visual segue exatamente os tokens da plataforma (accent,
 * dourado, felt) sem adicionar dependência nem peso de bundle.
 * Todos são componentes de servidor — nenhum estado, só render.
 */

/** Estado vazio padrão dos blocos financeiros. */
export function FinanceEmpty({
  message = "Revenue appears automatically after the first payments.",
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-white/10 text-center ${
        compact ? "h-28 p-4" : "h-48 p-6"
      }`}
    >
      <p className="max-w-xs text-sm text-dim">{message}</p>
    </div>
  );
}

const W = 560;
const H = 180;
const PAD = 8;

/** Formata o valor conforme o tipo da série. */
function fmt(v: number, money: boolean) {
  return money ? formatMoney(v) : String(v);
}

/**
 * Gráfico de linha com área preenchida. Usado para receita ao longo
 * do tempo e novas assinaturas por período.
 */
export function LineChart({
  points,
  money = false,
  color = "#00FF88",
}: {
  points: FinancePoint[];
  money?: boolean;
  color?: string;
}) {
  if (points.length === 0) return <FinanceEmpty compact />;

  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = (W - PAD * 2) / Math.max(points.length - 1, 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const coords = points.map((p, i) => [PAD + i * stepX, y(p.value)] as const);

  const linha = coords.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x},${yy}`).join(" ");
  const area = `${linha} L${coords[coords.length - 1][0]},${H - PAD} L${coords[0][0]},${H - PAD} Z`;
  const id = `grad-${color.replace("#", "")}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Line chart">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* linhas-guia */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path d={linha} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, yy], i) => (
          <circle key={i} cx={x} cy={yy} r="2.5" fill={color}>
            <title>{`${points[i].label}: ${fmt(points[i].value, money)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-dim">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Gráfico de barras horizontais — receita por plano. */
export function BarChart({
  items,
  money = true,
}: {
  items: { label: string; value: number }[];
  money?: boolean;
}) {
  if (items.length === 0) return <FinanceEmpty compact />;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 font-mono text-xs text-accent">{fmt(i.value, money)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-accent shadow-glow-sm"
              style={{ width: `${Math.max((i.value / max) * 100, i.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const CORES = ["#00FF88", "#C9A85C", "#4F9DFF", "#D72638", "#9B7BFF"];

/** Donut — distribuição das assinaturas por plano. */
export function DonutChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    return <FinanceEmpty compact message="No active subscriptions to break down." />;
  }

  const R = 60;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90" role="img"
        aria-label="Subscriptions by plan">
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
        {items.map((i, idx) => {
          const frac = i.value / total;
          const dash = frac * C;
          const el = (
            <circle
              key={i.label}
              cx="80" cy="80" r={R} fill="none"
              stroke={CORES[idx % CORES.length]}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
            >
              <title>{`${i.label}: ${i.value} (${Math.round(frac * 100)}%)`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
      </svg>

      <ul className="min-w-[9rem] flex-1 space-y-2">
        {items.map((i, idx) => (
          <li key={i.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CORES[idx % CORES.length] }} />
              <span className="truncate">{i.label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-dim">
              {i.value} · {Math.round((i.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
