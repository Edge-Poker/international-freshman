import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { SearchBar } from "@/components/forum/search-bar";
import { VoteButtons } from "@/components/forum/vote-buttons";
import { Button } from "@/components/ui/button";
import type { ForumTopic, ForumCategory, VoteValue } from "@/types/forum";
import { MessageSquare, Plus, ImageIcon, Pin } from "lucide-react";
import { UserLink } from "@/components/user-link";

export const metadata = { title: "Forum" };

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const { supabase, user } = await requirePremium();

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, title, description")
    .order("position");

  const catList = (categories ?? []) as ForumCategory[];
  const activeCat = cat ? catList.find((c) => c.slug === cat) : null;

  // busca ou listagem (sempre mais recentes no topo)
  let topics: ForumTopic[] = [];
  let dbError: string | null = null;
  if (q && q.trim()) {
    const { data, error } = await supabase.rpc("search_forum", { q: q.trim() });
    if (error) dbError = `Search failed: ${error.message}`;
    topics = (data ?? []) as ForumTopic[];
    // anexa autor das buscas (rpc nao embute relacoes)
    const ids = topics.map((t) => t.user_id);
    if (ids.length) {
      const { data: authors } = await supabase
        .from("profiles").select("id, name, nickname, avatar_url, chapters_done, rank_parts, is_admin").in("id", ids);
      const map = new Map((authors ?? []).map((a) => [a.id, a]));
      topics = topics.map((t) => ({ ...t, author: map.get(t.user_id) ?? null }));
    }
  } else {
    const sel = "*, author:profiles!forum_topics_user_id_fkey(name, nickname, avatar_url, chapters_done, rank_parts, is_admin)";
    let query = supabase
      .from("forum_topics")
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(50);
    if (activeCat) query = query.eq("category_id", activeCat.id);
    let pinQuery = supabase
      .from("forum_topics")
      .select(sel)
      .gt("pinned_until", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10);
    if (activeCat) pinQuery = pinQuery.eq("category_id", activeCat.id);
    const [{ data, error: e1 }, { data: pinnedData, error: e2 }] = await Promise.all([query, pinQuery]);
    if (e1) dbError = e1.message;
    else if (e2) dbError = `Pinned: ${e2.message}`;
    const fixados = (pinnedData ?? []) as unknown as ForumTopic[];
    const fixadosIds = new Set(fixados.map((t) => t.id));
    const recentes = ((data ?? []) as unknown as ForumTopic[]).filter((t) => !fixadosIds.has(t.id));
    topics = [...fixados, ...recentes];

    // plano B: se a consulta completa falhou, carrega os posts sem os dados de autor
    if (e1) {
      const { data: cru, error: e3 } = await supabase
        .from("forum_topics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!e3 && cru) topics = cru as unknown as ForumTopic[];
      else if (e3) dbError = `${dbError} | Fallback: ${e3.message}`;
    }
  }

  const estaFixado = (t: ForumTopic) =>
    Boolean(t.pinned_until && new Date(t.pinned_until) > new Date());

  // voto do usuario nos topicos exibidos, em uma consulta so
  const myVotes = new Map<number, VoteValue>();
  if (user && topics.length) {
    const { data: votes } = await supabase
      .from("forum_votes")
      .select("target_id, value")
      .eq("user_id", user.id)
      .eq("target_type", "topic")
      .in("target_id", topics.map((t) => t.id));
    (votes ?? []).forEach((v) => myVotes.set(v.target_id, v.value as VoteValue));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Forum</h1>
          <p className="mt-1 text-dim">Ask questions, share what worked, and help other students find their footing.</p>
        </div>
        <Link href="/forum/new">
          <Button><Plus className="h-4 w-4" /> New post</Button>
        </Link>
      </div>

      <div className="mt-6">
        <SearchBar />
      </div>

      {/* filtros de categoria */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/forum"
          className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${
            !activeCat && !q ? "bg-accent text-ink-950" : "bg-white/5 text-dim hover:text-white"
          }`}>
          All
        </Link>
        {catList.map((c) => (
          <Link key={c.id} href={`/forum?cat=${c.slug}`}
            className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${
              activeCat?.id === c.id ? "bg-accent text-ink-950" : "bg-white/5 text-dim hover:text-white"
            }`}>
            {c.title}
          </Link>
        ))}
      </div>

      {dbError && (
        <div className="card mt-6 border-danger/50 bg-danger/10 p-4">
          <p className="font-semibold text-danger">Could not load the forum</p>
          <p className="mt-1 break-all font-mono text-xs text-danger/90">{dbError}</p>
          <p className="mt-2 text-xs text-dim">
            Send a screenshot of this message to support so we can pin down the cause.
          </p>
        </div>
      )}

      {q && (
        <p className="mt-6 text-sm text-dim">
          {topics.length} result{topics.length === 1 ? "" : "s"} for <span className="text-white">{q}</span>
        </p>
      )}

      {/* lista */}
      <ul className="mt-6 space-y-3">
        {topics.map((t) => (
          <li key={t.id} className="card flex gap-4 p-4">
            <VoteButtons target="topic" id={t.id} initialScore={t.score} initialVote={myVotes.get(t.id) ?? 0} />
            <div className="min-w-0 flex-1">
              <Link href={`/forum/${t.id}`} className="block min-w-0">
                <p className="flex items-center gap-2 truncate font-semibold hover:text-accent">
                  {estaFixado(t) && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  )}
                  <span className="truncate">{t.title}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-dim">{t.body}</p>
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-dim">
                <UserLink author={t.author} />
                <span>{timeAgo(t.created_at)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {t.reply_count}</span>
                {t.images?.length > 0 && (
                  <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> {t.images.length}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {topics.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <p className="font-semibold">{q ? "Nothing found" : "No posts here yet"}</p>
          <p className="mt-2 text-sm text-dim">
            {q ? "Try different words." : "Be the first to start a discussion."}
          </p>
        </div>
      )}
    </main>
  );
}
