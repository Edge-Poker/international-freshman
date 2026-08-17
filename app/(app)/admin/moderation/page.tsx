import Link from "next/link";
import { Flag, Lock, MessageSquare, Pin, Sparkles } from "lucide-react";
import { listModComments, listModReports, listModTopics } from "@/lib/admin";
import type { ModerationSort, ModerationTab } from "@/types/admin";
import { UserLink } from "@/components/user-link";
import { FilterPills, FlagBadge } from "@/components/admin/ui";
import {
  ModDeleteButton, ModTopicActions, ReportResolveButton,
} from "@/components/admin/moderation-actions";
import { timeAgoShort } from "@/lib/format";

export const metadata = { title: "Admin · Moderation" };

const ABAS: { value: ModerationTab; label: string }[] = [
  { value: "posts", label: "Posts" },
  { value: "comentarios", label: "Comments" },
  { value: "denuncias", label: "Reports" },
];
const ORDENS: { value: ModerationSort; label: string }[] = [
  { value: "recentes", label: "Most recent" },
  { value: "curtidos", label: "Most upvoted" },
  { value: "comentados", label: "Most commented" },
  { value: "denunciados", label: "Denunciados" },
];

export default async function AdminModeracaoPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; ord?: string }>;
}) {
  const sp = await searchParams;
  const aba = (ABAS.some((a) => a.value === sp.aba) ? sp.aba : "posts") as ModerationTab;
  const ord = (ORDENS.some((o) => o.value === sp.ord) ? sp.ord : "recentes") as ModerationSort;
  const params = { aba: sp.aba, ord: sp.ord };

  return (
    <div>
      <h2 className="font-display text-xl font-black">Moderation</h2>
      <p className="mt-1 text-sm text-dim">
        All community content in one place: posts, comments and reports.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <FilterPills basePath="/admin/moderation" param="aba" options={ABAS} current={aba} params={params} />
        {aba !== "denuncias" && (
          <FilterPills basePath="/admin/moderation" param="ord"
            options={aba === "comentarios"
              ? ORDENS.filter((o) => o.value !== "comentados")
              : ORDENS}
            current={ord} params={params} />
        )}
      </div>

      <div className="mt-6">
        {aba === "posts" && <PostsTab ord={ord} />}
        {aba === "comentarios" && <ComentariosTab ord={ord} />}
        {aba === "denuncias" && <DenunciasTab />}
      </div>
    </div>
  );
}

async function PostsTab({ ord }: { ord: ModerationSort }) {
  const topics = await listModTopics(ord);
  const fixado = (t: { pinned_until: string | null }) =>
    Boolean(t.pinned_until && new Date(t.pinned_until) > new Date());

  return (
    <ul className="grid gap-3">
      {topics.map((t) => (
        <li key={t.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link href={`/forum/${t.id}`} className="font-semibold transition-colors hover:text-accent">
                {t.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-dim">{t.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <UserLink author={t.author} />
                <span className="font-mono text-[11px] text-dim">
                  {timeAgoShort(t.created_at)} · ▲ {t.score} · {t.reply_count} resposta{t.reply_count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fixado(t) && <FlagBadge tone="accent"><Pin className="h-3 w-3" /> fixado</FlagBadge>}
              {t.is_featured && <FlagBadge tone="gold"><Sparkles className="h-3 w-3" /> destaque</FlagBadge>}
              {t.is_locked && <FlagBadge tone="danger"><Lock className="h-3 w-3" /> fechado</FlagBadge>}
              {t.reports_open > 0 && (
                <FlagBadge tone="danger"><Flag className="h-3 w-3" /> {t.reports_open} report{t.reports_open === 1 ? "" : "s"}</FlagBadge>
              )}
            </div>
          </div>
          <div className="mt-3 border-t border-white/5 pt-3">
            <ModTopicActions topicId={t.id} isPinned={fixado(t)}
              isFeatured={t.is_featured} isLocked={t.is_locked} />
          </div>
        </li>
      ))}
      {topics.length === 0 && (
        <li className="card p-10 text-center text-sm text-dim">
          Nada por aqui com esse filtro.
        </li>
      )}
    </ul>
  );
}

async function ComentariosTab({ ord }: { ord: ModerationSort }) {
  const comments = await listModComments(ord);

  return (
    <ul className="grid gap-3">
      {comments.map((c) => (
        <li key={`${c.kind}-${c.id}`} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 text-sm">{c.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <UserLink author={c.author} />
                <span className="font-mono text-[11px] text-dim">
                  {timeAgoShort(c.created_at)}
                  {c.score !== null && <> · ▲ {c.score}</>}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-dim">
                <MessageSquare className="h-3 w-3" />
                {c.kind === "reply" ? "Reply in" : "Comment on chapter"}:{" "}
                {c.kind === "reply" ? (
                  <Link href={`/forum/${c.parent_id}`} className="text-accent hover:brightness-125">
                    {c.parent_label}
                  </Link>
                ) : (
                  <span className="text-white">{c.parent_label}</span>
                )}
              </p>
            </div>
            <ModDeleteButton id={c.id} kind={c.kind} />
          </div>
        </li>
      ))}
      {comments.length === 0 && (
        <li className="card p-10 text-center text-sm text-dim">
          No comments match this filter.
        </li>
      )}
    </ul>
  );
}

async function DenunciasTab() {
  const reports = await listModReports();
  const tipo = { topic: "topic", post: "resposta", comment: "comment" } as const;

  return (
    <ul className="grid gap-3">
      {reports.map((r) => (
        <li key={r.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <FlagBadge tone={r.resolved ? "dim" : "danger"}>
                  <Flag className="h-3 w-3" /> {r.resolved ? "resolvida" : "aberta"}
                </FlagBadge>
                <span className="font-mono text-[11px] text-dim">
                  {tipo[r.target_type]} #{r.target_id} · {timeAgoShort(r.created_at)}
                </span>
              </p>
              {r.reason && <p className="mt-2 text-sm">“{r.reason}”</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dim">
                <span>denunciado por</span> <UserLink author={r.reporter} />
              </div>
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                {r.target_excerpt ? (
                  <>
                    <p className="line-clamp-2 text-sm text-dim">{r.target_excerpt}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {r.target_author && <UserLink author={r.target_author} />}
                      {r.target_href && (
                        <Link href={r.target_href} className="font-mono text-[11px] text-accent hover:brightness-125">
                          open content →
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-dim">Content already removed.</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ReportResolveButton reportId={r.id} resolved={r.resolved} />
              {r.target_excerpt && r.target_type !== "topic" && (
                <ModDeleteButton id={r.target_id} kind={r.target_type === "post" ? "reply" : "comment"} />
              )}
            </div>
          </div>
        </li>
      ))}
      {reports.length === 0 && (
        <li className="card p-10 text-center text-sm text-dim">
          No reports on file. The community thanks you.
        </li>
      )}
    </ul>
  );
}
