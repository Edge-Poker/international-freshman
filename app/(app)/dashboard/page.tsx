import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { allChapters, curso } from "@/content/course";
import { canAccessPremiumContent, isFreeChapter } from "@/lib/access";
import { LockedContent } from "@/components/course/locked-content";
import { Flame, Clock, Trophy, ArrowRight, Users, Lock, Zap } from "lucide-react";
import { RankBadge } from "@/components/profile/rank-badge";
import { coursePct } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const premium = (await canAccessPremiumContent(undefined, supabase)).allowed;

  const [{ data: profile }, { data: progress }, { count: seguidores }, { count: seguindo }] = await Promise.all([
    supabase.from("profiles").select("name, nickname, xp, level, streak_days, chapters_done, rank_parts").eq("id", user!.id).single(),
    supabase.from("lesson_progress").select("chapter_id, status, seconds_studied, chapters(slug)").eq("user_id", user!.id),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", user!.id),
    supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", user!.id),
  ]);

  const done = progress?.filter((p) => p.status === "concluido").length ?? 0;
  const total = allChapters.length;
  const pct = Math.round((done / total) * 100);
  const seconds = progress?.reduce((s, p) => s + (p.seconds_studied ?? 0), 0) ?? 0;
  const horas = Math.floor(seconds / 3600);
  const minutos = Math.floor((seconds % 3600) / 60);
  const tempo = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
  const doneSlugs = new Set(
    (progress ?? [])
      .filter((p) => p.status === "concluido")
      .map((p) => (p.chapters as unknown as { slug: string } | null)?.slug)
  );
  const proxima = allChapters.find((c) => !doneSlugs.has(c.slug)) ?? allChapters[0];
  // conta free acessa o capitulo 1 (isFree) pelo dashboard; premium acessa tudo.
  const podeAbrirProxima = premium || isFreeChapter(proxima.slug);
  const nome = profile?.name?.split(" ")[0] ?? "student";

  // faixas de nível — espelham public.compute_level (migration 0022)
  const FAIXAS = [0, 300, 700, 1200, 1800, 2500, 3200];
  const xp = profile?.xp ?? 0;
  const nivel = profile?.level ?? 1;
  const baseNivel = FAIXAS[nivel - 1] ?? 0;
  const proximoNivel = FAIXAS[nivel] ?? null; // null = nivel maximo
  const pctNivel = proximoNivel
    ? Math.min(100, Math.round(((xp - baseNivel) / (proximoNivel - baseNivel)) * 100))
    : 100;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            Welcome back, {nome}
          </h1>
          <p className="mt-1 text-dim">The semester keeps moving. Today is the part you control.</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dim">
            {profile?.nickname && (
              <>
                <Link href={`/u/${profile.nickname}/connections?tab=followers`} className="whitespace-nowrap hover:text-accent">
                  <span className="text-white">{seguidores ?? 0}</span> followers
                </Link>
                <Link href={`/u/${profile.nickname}/connections?tab=following`} className="whitespace-nowrap hover:text-accent">
                  <span className="text-white">{seguindo ?? 0}</span> following
                </Link>
                <Link href={`/u/${profile.nickname}`} className="flex items-center gap-1 whitespace-nowrap hover:text-accent">
                  <Users className="h-3.5 w-3.5" /> view profile
                </Link>
              </>
            )}
          </div>
        </div>
        {/* rank do curso */}
        <div className="flex flex-col items-center gap-1">
          <RankBadge rank={profile?.rank_parts} size="md" />
          <span className="font-mono text-[10px] text-dim">your rank · {coursePct(profile)}%</span>
        </div>
      </div>

      {/* stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Trophy className="h-5 w-5 text-accent" />} label="Overall progress"
          value={`${pct}%`} sub={`${done} of ${total} chapters`} />
        <Stat icon={<Flame className="h-5 w-5 text-danger" />} label="Streak"
          value={`${profile?.streak_days ?? 0} days`} sub="consecutive days studied" />
        <Stat icon={<Clock className="h-5 w-5 text-gold" />} label="Time studied"
          value={tempo} sub="reading time across chapters" />
      </div>

      {/* nivel e XP */}
      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-2 font-mono text-xs text-dim">
            <Zap className="h-4 w-4 text-accent" /> Level
          </p>
          <p className="font-mono text-xs text-dim">
            <span className="text-white">{xp}</span> XP
            {proximoNivel && (
              <> · <span className="text-accent">{proximoNivel - xp}</span> to level {nivel + 1}</>
            )}
          </p>
        </div>
        <p className="mt-1 font-display text-2xl font-black sm:text-3xl">
          Level {nivel}
          {!proximoNivel && <span className="ml-2 font-mono text-xs text-gold">max</span>}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-accent shadow-glow-sm transition-all"
            style={{ width: `${pctNivel}%` }} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-dim">
          50 XP per chapter completed · 300 XP per exam passed
        </p>
      </div>

      {/* aviso do plano free: estrutura visivel, conteudo bloqueado */}
      {!premium && (
        <Link href="/pricing"
          className="card mt-6 flex items-center gap-4 border-accent/30 p-5 transition-colors hover:border-accent/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <Lock className="h-5 w-5 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">You are on the Free plan</p>
            <p className="mt-0.5 text-sm text-dim">
              The whole platform is visible. Subscribe to open the chapters,
              take the exams and read the content.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
        </Link>
      )}

      {/* continuar estudando */}
      {podeAbrirProxima ? (
        <Link
          href={`/course/${proxima.slug}`}
          className="card group mt-6 flex items-center justify-between gap-4 p-6 transition-colors hover:border-accent/40"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              {premium ? "Continue studying" : "Start studying"}
            </p>
            <p className="mt-1 text-lg font-semibold">{proxima.title}</p>
            <p className="mt-1 text-sm text-dim">{proxima.summary}</p>
            {!premium && (
              <p className="mt-2 font-mono text-xs text-accent">
                The Introduction and Chapter 1 are free — the rest require a subscription.
              </p>
            )}
          </div>
          <ArrowRight className="h-6 w-6 shrink-0 text-dim transition-transform group-hover:translate-x-1 group-hover:text-accent" />
        </Link>
      ) : (
        <LockedContent title={proxima.title} description={proxima.summary}
          className="card group mt-6 flex items-center justify-between gap-4 p-6 transition-colors hover:border-accent/40">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Start studying</p>
            <p className="mt-1 text-lg font-semibold">{proxima.title}</p>
            <p className="mt-1 text-sm text-dim">{proxima.summary}</p>
          </div>
          <Lock className="h-6 w-6 shrink-0 text-dim transition-colors group-hover:text-accent" />
        </LockedContent>
      )}

      {/* barra por parte */}
      <h2 className="mt-12 font-display text-xl font-black">Progress by part</h2>
      <div className="mt-4 space-y-4">
        {curso.map((parte) => {
          const doneNaParte = parte.chapters.filter((c) => doneSlugs.has(c.slug)).length;
          const pctParte = Math.round((doneNaParte / parte.chapters.length) * 100);
          return (
            <div key={parte.slug} className="card p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{parte.title} · {parte.subtitle}</span>
                <span className="font-mono text-dim">{doneNaParte}/{parte.chapters.length}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-accent shadow-glow-sm transition-all duration-700"
                  style={{ width: `${pctParte}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm text-dim">{icon} {label}</div>
      <p className="mt-2 font-display text-2xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 font-mono text-xs text-dim">{sub}</p>
    </div>
  );
}
