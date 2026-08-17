import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { allChapters } from "@/content/course";
import { UserLink } from "@/components/user-link";
import type { ForumTopic } from "@/types/forum";
import { BookOpen, MessagesSquare, Star } from "lucide-react";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const { supabase, user } = await requirePremium();

  const [{ data: favCaps }, { data: favTopics }] = await Promise.all([
    supabase
      .from("favorites")
      .select("created_at, chapters(slug)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("forum_favorites")
      .select("created_at, topic:forum_topics(*, author:profiles!forum_topics_user_id_fkey(name, nickname, avatar_url, chapters_done, rank_parts, is_admin))")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const capitulos = (favCaps ?? [])
    .map((f) => allChapters.find(
      (c) => c.slug === (f.chapters as unknown as { slug: string } | null)?.slug
    ))
    .filter(Boolean);
  const topicos = (favTopics ?? [])
    .map((f) => f.topic as unknown as ForumTopic | null)
    .filter(Boolean) as ForumTopic[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Saved</h1>
      <p className="mt-1 text-dim">Your saved chapters and forum posts, always within reach.</p>

      {/* Capitulos favoritos */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <BookOpen className="h-5 w-5 text-accent" /> Saved chapters
        </h2>
        <ul className="mt-4 space-y-2">
          {capitulos.map((c) => (
            <li key={c!.slug}>
              <Link href={`/course/${c!.slug}`}
                className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                <Star className="h-4 w-4 shrink-0 text-gold" fill="currentColor" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold sm:truncate">{c!.title}</p>
                  <p className="line-clamp-2 text-sm text-dim sm:truncate">{c!.summary}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-dim">{c!.estMinutes} min</span>
              </Link>
            </li>
          ))}
        </ul>
        {capitulos.length === 0 && (
          <p className="card mt-4 p-6 text-sm text-dim">
            No saved chapters yet. Use the star inside any chapter.
          </p>
        )}
      </section>

      {/* Posts favoritos */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-black">
          <MessagesSquare className="h-5 w-5 text-accent" /> Saved posts
        </h2>
        <ul className="mt-4 space-y-2">
          {topicos.map((t) => (
            <li key={t.id} className="card p-4 transition-colors hover:border-accent/40">
              <Link href={`/forum/${t.id}`} className="block min-w-0">
                <p className="line-clamp-2 font-semibold hover:text-accent sm:truncate">{t.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-dim">{t.body}</p>
              </Link>
              <div className="mt-2 flex items-center gap-3 font-mono text-xs text-dim">
                <UserLink author={t.author} />
                <span>{t.reply_count} replies</span>
              </div>
            </li>
          ))}
        </ul>
        {topicos.length === 0 && (
          <p className="card mt-4 p-6 text-sm text-dim">
            No saved posts yet. Use the star inside any forum post.
          </p>
        )}
      </section>
    </main>
  );
}
