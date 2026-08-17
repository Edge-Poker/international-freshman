import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { nameWithPct } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  chapters_done: number | null;
  rank_parts: number | null;
  is_admin: boolean | null;
}

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { nickname } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "following" ? "following" : "followers";

  const { supabase } = await requirePremium();
  const { data: dono } = await supabase
    .from("profiles")
    .select("id, nickname")
    .ilike("nickname", decodeURIComponent(nickname))
    .maybeSingle();
  if (!dono) notFound();

  const coluna = tab === "followers" ? "followed_id" : "follower_id";
  const alvo = tab === "followers" ? "follower_id" : "followed_id";
  const { data: rels } = await supabase
    .from("follows")
    .select(`${alvo}`)
    .eq(coluna, dono.id);
  const ids = (rels ?? []).map((r) => (r as Record<string, string>)[alvo]);

  let perfis: Profile[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, nickname, avatar_url, chapters_done, rank_parts, is_admin")
      .in("id", ids);
    perfis = (data ?? []) as Profile[];
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href={`/u/${dono.nickname}`} className="inline-flex items-center gap-2 text-sm text-dim hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>
      <h1 className="mt-4 font-display text-2xl font-black tracking-tight sm:text-3xl">@{dono.nickname}</h1>

      <div className="mt-6 flex gap-2">
        <Link href={`/u/${dono.nickname}/connections?tab=followers`}
          className={`rounded-full px-4 py-1.5 font-mono text-xs transition-colors ${
            tab === "followers" ? "bg-accent text-ink-950" : "bg-white/5 text-dim hover:text-white"
          }`}>
          Followers
        </Link>
        <Link href={`/u/${dono.nickname}/connections?tab=following`}
          className={`rounded-full px-4 py-1.5 font-mono text-xs transition-colors ${
            tab === "following" ? "bg-accent text-ink-950" : "bg-white/5 text-dim hover:text-white"
          }`}>
          Following
        </Link>
      </div>

      <ul className="mt-6 space-y-2">
        {perfis.map((p) => (
          <li key={p.id}>
            <Link href={p.nickname ? `/u/${p.nickname}` : "#"}
              className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
              <Avatar url={p.avatar_url} name={p.nickname ?? p.name} />
              <span className="flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold text-accent">
                <span className="truncate">{nameWithPct(p)}</span>
                {p.is_admin && <VerifiedBadge />}
              </span>
              <span className="ml-auto shrink-0"><RankBadge rank={p.rank_parts} size="sm" /></span>
            </Link>
          </li>
        ))}
      </ul>

      {perfis.length === 0 && (
        <p className="card mt-6 p-8 text-center text-sm text-dim">
          {tab === "followers" ? "Nobody follows this account yet." : "This account is not following anyone yet."}
        </p>
      )}
    </main>
  );
}
