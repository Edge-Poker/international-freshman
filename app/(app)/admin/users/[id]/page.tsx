import Link from "next/link";
import {
  ArrowLeft, BookOpenCheck, GraduationCap, Heart, MessageSquare, MessagesSquare, Star,
} from "lucide-react";
import { getUserDetail } from "@/lib/admin";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { UserActions } from "@/components/admin/user-actions";
import { FlagBadge, PlanBadge, SubStatusBadge } from "@/components/admin/ui";
import { formatDateShort, formatDateTime } from "@/lib/format";

export const metadata = { title: "Admin · User" };

export default async function AdminUsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detalhe = await getUserDetail(id);

  if (!detalhe) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold">User not found</p>
        <p className="mt-2 text-sm text-dim">The account may have been deleted.</p>
        <Link href="/admin/users"
          className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-accent hover:brightness-125">
          <ArrowLeft className="h-3.5 w-3.5" /> back to users
        </Link>
      </div>
    );
  }

  const { profile: p, counts, subscription: sub } = detalhe;
  const vencimento = sub?.current_period_end ?? sub?.ends_at ?? null;

  return (
    <div>
      <Link href="/admin/users"
        className="inline-flex items-center gap-2 font-mono text-xs text-dim transition-colors hover:text-accent">
        <ArrowLeft className="h-3.5 w-3.5" /> users
      </Link>

      {/* cabeçalho */}
      <div className="card mt-4 flex flex-wrap items-center gap-5 p-6">
        <Avatar url={p.avatar_url} name={p.nickname ?? p.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-black">
              {p.nickname ? `@${p.nickname}` : p.name ?? "sem nome"}
            </span>
            {p.is_admin && <VerifiedBadge />}
            <PlanBadge plan={p.plan} />
            {p.is_banned && <FlagBadge tone="danger">banido</FlagBadge>}
            {p.is_silenced && <FlagBadge tone="gold">silenciado</FlagBadge>}
          </p>
          {p.name && p.nickname && <p className="mt-0.5 text-sm text-dim">{p.name}</p>}
          <p className="mt-0.5 truncate font-mono text-xs text-dim">{detalhe.email ?? "—"}</p>
          {p.nickname && (
            <Link href={`/u/${p.nickname}`}
              className="mt-2 inline-block font-mono text-xs text-accent hover:brightness-125">
              view public profile →
            </Link>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <RankBadge rank={p.rank_parts} size="md" />
          <span className="font-mono text-[10px] text-dim">rank · level {p.level}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6">
          {/* conta e assinatura */}
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black">Account and subscription</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info label="Signup date" value={formatDateShort(p.created_at)} />
              <Info label="Last login" value={formatDateTime(detalhe.last_sign_in_at)} />
              <Info label="Current plan" value={<PlanBadge plan={p.plan} />} />
              <Info label="Subscription status"
                value={<SubStatusBadge status={sub?.status} grants={p.plan !== "free"} />} />
              <Info label="Expiry date"
                value={sub?.plan?.interval === "lifetime" ? "never expires (lifetime)" : formatDateShort(vencimento)} />
              <Info label="Subscriber since" value={formatDateShort(sub?.started_at)} />
              {sub?.cancel_at_period_end && (
                <Info label="Renewal" value={<FlagBadge tone="gold">cancels at period end</FlagBadge>} />
              )}
              {sub?.provider && <Info label="Provider" value={sub.provider} mono />}
            </dl>
          </div>

          {/* atividade */}
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black">Atividade</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric icon={<MessagesSquare className="h-4 w-4 text-accent" />}
                label="Forum posts" value={counts.topics + counts.replies}
                sub={`${counts.topics} topics · ${counts.replies} replies`} />
              <Metric icon={<MessageSquare className="h-4 w-4 text-accent" />}
                label="Comments" value={counts.comments} sub="nas aulas" />
              <Metric icon={<BookOpenCheck className="h-4 w-4 text-gold" />}
                label="Chapters completed" value={counts.chapters_done} sub={`cache: ${p.chapters_done}`} />
              <Metric icon={<Star className="h-4 w-4 text-gold" />}
                label="Saved chapters" value={counts.favorites_course} sub="no curso" />
              <Metric icon={<Heart className="h-4 w-4 text-danger" />}
                label="Saved posts" value={counts.favorites_forum} sub="in the forum" />
              <Metric icon={<GraduationCap className="h-4 w-4 text-accent" />}
                label="Exams passed" value={counts.exams_passed} sub={`de 4 partes · ${p.xp} XP`} />
            </div>
          </div>
        </div>

        {/* ações */}
        <UserActions
          userId={p.id}
          currentPlan={p.plan}
          isBanned={p.is_banned}
          isSilenced={p.is_silenced}
          isAdmin={p.is_admin}
        />
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-dim">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-xs" : "mt-1"}>{value}</dd>
    </div>
  );
}

function Metric({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-dim">{icon} {label}</div>
      <p className="mt-1.5 font-display text-2xl font-black tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p>}
    </div>
  );
}
