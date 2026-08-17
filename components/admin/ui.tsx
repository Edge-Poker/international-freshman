import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Card de estatística do dashboard (padrão do Stat do /dashboard)     */
/* ------------------------------------------------------------------ */

export function StatCard({
  icon, label, value, sub, accent = "accent",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "accent" | "gold" | "danger" | "dim";
}) {
  const valueCls = {
    accent: "text-white", gold: "text-gold", danger: "text-danger", dim: "text-dim",
  }[accent];
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-dim">{icon} {label}</div>
      <p className={cn("mt-2 font-display text-2xl font-black tabular-nums sm:text-3xl", valueCls)}>
        {value}
      </p>
      {sub && <p className="mt-1 font-mono text-[11px] text-dim">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips de plano e status                                             */
/* ------------------------------------------------------------------ */

const CHIP =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px]";

export function PlanBadge({ plan }: { plan?: string | null }) {
  const p = plan ?? "free";
  const cls = {
    vitalicio: "border-gold/50 bg-gold/10 text-gold",
    pro: "border-accent/40 bg-accent/10 text-accent",
    anual: "border-accent/40 bg-accent/10 text-accent",
    free: "border-white/10 bg-white/5 text-dim",
  }[p] ?? "border-white/10 bg-white/5 text-dim";
  const label = { vitalicio: "Lifetime", pro: "Monthly", anual: "Yearly", free: "Free" }[p] ?? p;
  return <span className={cn(CHIP, cls)}>{label}</span>;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active", canceled: "Canceled", past_due: "Pending",
  incomplete: "Pending", expired: "Expired",
};

export function SubStatusBadge({
  status, grants,
}: { status?: string | null; grants?: boolean }) {
  if (!status) return <span className={cn(CHIP, "border-white/10 bg-white/5 text-dim")}>—</span>;
  const efetivo = status === "active" && grants === false ? "expired" : status;
  const cls = {
    active: "border-accent/40 bg-accent/10 text-accent",
    past_due: "border-gold/50 bg-gold/10 text-gold",
    incomplete: "border-gold/50 bg-gold/10 text-gold",
    canceled: "border-white/15 bg-white/5 text-dim",
    expired: "border-danger/40 bg-danger/10 text-danger",
  }[efetivo] ?? "border-white/10 bg-white/5 text-dim";
  return <span className={cn(CHIP, cls)}>{STATUS_LABEL[efetivo] ?? efetivo}</span>;
}

export function FlagBadge({
  children, tone = "dim",
}: { children: React.ReactNode; tone?: "danger" | "gold" | "dim" | "accent" }) {
  const cls = {
    danger: "border-danger/40 bg-danger/10 text-danger",
    gold: "border-gold/50 bg-gold/10 text-gold",
    accent: "border-accent/40 bg-accent/10 text-accent",
    dim: "border-white/10 bg-white/5 text-dim",
  }[tone];
  return <span className={cn(CHIP, cls)}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Pills de filtro por link (preservam os demais parâmetros)           */
/* ------------------------------------------------------------------ */

export function FilterPills({
  basePath, param, options, current, params,
}: {
  basePath: string;
  param: string;
  options: { value: string; label: string }[];
  current: string;
  /** demais parâmetros atuais, preservados ao trocar de filtro */
  params: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v && k !== param && k !== "pagina") qs.set(k, v);
        }
        if (o.value !== options[0].value) qs.set(param, o.value);
        const href = qs.size ? `${basePath}?${qs}` : basePath;
        const ativo = current === o.value;
        return (
          <Link
            key={o.value}
            href={href}
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
              ativo
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-white/10 text-dim hover:border-accent/40 hover:text-white"
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paginação por link                                                  */
/* ------------------------------------------------------------------ */

export function Pagination({
  basePath, page, total, pageSize, params,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const link = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") qs.set(k, v);
    if (p > 1) qs.set("pagina", String(p));
    return qs.size ? `${basePath}?${qs}` : basePath;
  };
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-dim transition-colors hover:border-accent/50 hover:text-accent";

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="font-mono text-xs text-dim">
        page <span className="text-white">{page}</span> of {pages} ·{" "}
        <span className="text-white">{total}</span> record{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={link(page - 1)} aria-label="Previous page" className={btn}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-30")}><ChevronLeft className="h-4 w-4" /></span>
        )}
        {page < pages ? (
          <Link href={link(page + 1)} aria-label="Next page" className={btn}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-30")}><ChevronRight className="h-4 w-4" /></span>
        )}
      </div>
    </div>
  );
}
