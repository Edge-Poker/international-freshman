import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { UserSearchBar } from "@/components/user-search-bar";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { nameWithPct } from "@/lib/format";
import { VerifiedBadge } from "@/components/verified-badge";

export const metadata = { title: "Students" };

interface Student {
  id: string;
  name: string | null;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  chapters_done: number | null;
  rank_parts: number | null;
  is_admin: boolean | null;
  xp: number | null;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase, user } = await requirePremium();
  const termo = (q ?? "").trim().replace(/^@+/, "");

  // ranking por maior XP acumulado; empate desfeito por cadastro mais antigo
  let query = supabase
    .from("profiles")
    .select("id, name, nickname, bio, avatar_url, chapters_done, rank_parts, is_admin, xp")
    .not("nickname", "is", null)
    .eq("is_banned", false)
    .order("xp", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(24);
  if (termo) query = query.ilike("nickname", `%${termo}%`);
  const { data } = await query;
  let jogadores = (data ?? []) as Student[];
  if (user) {
    const { data: bloqueios } = await supabase
      .from("blocks").select("blocked_id").eq("blocker_id", user.id);
    const bloqueados = new Set((bloqueios ?? []).map((b) => b.blocked_id));
    jogadores = jogadores.filter((j) => !bloqueados.has(j.id));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Students</h1>
      <p className="mt-1 text-dim">
        Ranked by XP earned. Find other students by @nickname and visit their profiles.
      </p>

      <div className="mt-6">
        <UserSearchBar />
      </div>

      {termo && (
        <p className="mt-6 text-sm text-dim">
          {jogadores.length} result{jogadores.length === 1 ? "" : "s"} for{" "}
          <span className="font-mono text-accent">@{termo}</span>
        </p>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {jogadores.map((j, i) => (
          <li key={j.id}>
            <Link
              href={`/u/${j.nickname}`}
              className="card flex items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow-sm"
            >
              {!termo && (
                <span className="w-6 shrink-0 text-center font-mono text-sm font-bold text-dim">
                  {i + 1}
                </span>
              )}
              <Avatar url={j.avatar_url} name={j.nickname} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-mono text-sm font-semibold text-accent">
                  <span className="truncate">{nameWithPct(j)}</span>
                  {j.is_admin && <VerifiedBadge />}
                </p>
                <p className="mt-0.5 font-mono text-xs text-dim">{j.xp ?? 0} XP</p>
                {j.bio && <p className="mt-0.5 truncate text-xs text-dim">{j.bio}</p>}
              </div>
              <RankBadge rank={j.rank_parts} size="sm" />
            </Link>
          </li>
        ))}
      </ul>

      {jogadores.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <p className="font-semibold">{termo ? "No students found" : "No students with a nickname yet"}</p>
          <p className="mt-2 text-sm text-dim">
            {termo ? "Check the @ handle and try again." : "Profiles show up here as students choose their nicknames."}
          </p>
        </div>
      )}
    </main>
  );
}
