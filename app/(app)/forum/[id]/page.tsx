import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { ReplyForm } from "@/components/forum/reply-form";
import { Attachments } from "@/components/forum/attachments";
import type { ForumTopic, ForumPost, VoteValue } from "@/types/forum";
import { ArrowLeft, MessageSquare, Pin } from "lucide-react";
import { DeleteButton } from "@/components/forum/delete-button";
import { PinControl } from "@/components/forum/pin-control";
import { TopicFavoriteButton } from "@/components/forum/topic-favorite-button";
import { ReportButton } from "@/components/forum/report-button";
import { UserLink } from "@/components/user-link";
import { MentionText } from "@/components/forum/mention-text";
import { Lock } from "lucide-react";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function TopicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) notFound();

  const { supabase, user } = await requirePremium();
  let souAdmin = false;
  let favoritado = false;
  if (user) {
    const [{ data: me }, { data: fav }] = await Promise.all([
      supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
      supabase.from("forum_favorites").select("topic_id")
        .eq("user_id", user.id).eq("topic_id", topicId).maybeSingle(),
    ]);
    souAdmin = Boolean(me?.is_admin);
    favoritado = Boolean(fav);
  }

  const { data: topic, error: topicError } = await supabase
    .from("forum_topics")
    .select("*, author:profiles!forum_topics_user_id_fkey(name, nickname, avatar_url, chapters_done, rank_parts, is_admin)")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <div className="card border-danger/50 bg-danger/10 p-6">
          <p className="font-semibold text-danger">Erro ao carregar esta postagem</p>
          <p className="mt-2 break-all font-mono text-xs text-danger/90">{topicError.message}</p>
          <p className="mt-3 text-xs text-dim">
            A postagem existe no banco, mas a leitura falhou. Me envie um print
            desta mensagem para eu identificar a causa exata.
          </p>
        </div>
      </main>
    );
  }
  if (!topic) notFound();
  const t = topic as unknown as ForumTopic;

  const { data: replies, error: repliesError } = await supabase
    .from("forum_posts")
    .select("*, author:profiles!forum_posts_user_id_fkey(name, nickname, avatar_url, chapters_done, rank_parts, is_admin)")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });
  const posts = (replies ?? []) as unknown as ForumPost[];

  // votos do usuário: no tópico e em cada resposta, numa consulta só
  const topicVote = { value: 0 as VoteValue };
  const postVotes = new Map<number, VoteValue>();
  if (user) {
    const { data: votes } = await supabase
      .from("forum_votes")
      .select("target_type, target_id, value")
      .eq("user_id", user.id)
      .or(`and(target_type.eq.topic,target_id.eq.${topicId}),target_type.eq.post`);
    (votes ?? []).forEach((v) => {
      if (v.target_type === "topic" && v.target_id === topicId) topicVote.value = v.value as VoteValue;
      if (v.target_type === "post") postVotes.set(v.target_id, v.value as VoteValue);
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm text-dim hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to forum
      </Link>

      {/* pergunta */}
      <article className="card mt-4 flex gap-4 p-6">
        <VoteButtons target="topic" id={t.id} initialScore={t.score} initialVote={topicVote.value} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-black leading-tight tracking-tight">
            {t.pinned_until && new Date(t.pinned_until) > new Date() && (
              <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 font-mono text-[10px] font-normal text-accent">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            <span>{t.title}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-dim">
            <UserLink author={t.author} />
            <span>{fmt(t.created_at)}</span>
            {(user?.id === t.user_id || souAdmin) && <DeleteButton kind="topic" id={t.id} topicId={t.id} />}
            {user && (
              <TopicFavoriteButton topicId={t.id} initialFavorited={favoritado} />
            )}
            {user && user.id !== t.user_id && (
              <ReportButton targetType="topic" targetId={t.id} />
            )}
          </div>
          <MentionText text={t.body} className="mt-4 whitespace-pre-wrap leading-relaxed" />
          <Attachments images={t.images} />
        </div>
      </article>

      {souAdmin && (
        <PinControl
          topicId={t.id}
          isPinned={Boolean(t.pinned_until && new Date(t.pinned_until) > new Date())}
        />
      )}

      {/* respostas */}
      {repliesError && (
        <div className="card mt-6 border-danger/50 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-danger">Could not load the replies</p>
          <p className="mt-1 break-all font-mono text-xs text-danger/90">{repliesError.message}</p>
        </div>
      )}

      <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-black">
        <MessageSquare className="h-5 w-5 text-accent" />
        {posts.length} resposta{posts.length === 1 ? "" : "s"}
      </h2>

      <ul className="mt-4 space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="card flex gap-4 p-5">
            <VoteButtons target="post" id={p.id} initialScore={p.score} initialVote={postVotes.get(p.id) ?? 0} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-dim">
                <UserLink author={p.author} />
                <span>{fmt(p.created_at)}</span>
                {(user?.id === p.user_id || souAdmin) && <DeleteButton kind="post" id={p.id} topicId={t.id} />}
                {user && user.id !== p.user_id && (
                  <ReportButton targetType="post" targetId={p.id} />
                )}
              </div>
              <MentionText text={p.body} className="mt-2 whitespace-pre-wrap leading-relaxed" />
              <Attachments images={p.images} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {t.is_locked && !souAdmin ? (
          <div className="card flex items-center gap-3 border-danger/30 p-5 text-sm text-dim">
            <Lock className="h-5 w-5 shrink-0 text-danger" />
            <span>
              This discussion was closed by moderation and is not accepting new
              replies. You can still read and vote.
            </span>
          </div>
        ) : user ? (
          <>
            {t.is_locked && souAdmin && (
              <p className="mb-2 flex items-center gap-1.5 font-mono text-xs text-gold">
                <Lock className="h-3.5 w-3.5" /> Discussion closed — only moderators can reply.
              </p>
            )}
            <ReplyForm topicId={t.id} />
          </>
        ) : (
          <div className="card p-5 text-center text-sm text-dim">
            <Link href="/login" className="text-accent">Entre</Link> para responder.
          </div>
        )}
      </div>
    </main>
  );
}
