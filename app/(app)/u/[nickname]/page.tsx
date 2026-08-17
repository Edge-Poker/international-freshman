import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { BanButton } from "@/components/profile/ban-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { FollowButton } from "@/components/profile/follow-button";
import { BlockButton } from "@/components/profile/block-button";
import { SilenceButton } from "@/components/profile/silence-button";
import { coursePct, displayName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Settings, Trophy } from "lucide-react";

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const { supabase, user } = await requirePremium();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, nickname, bio, avatar_url, chapters_done, rank_parts, is_admin, is_banned, is_silenced, four_aces_at, created_at")
    .ilike("nickname", decodeURIComponent(nickname))
    .maybeSingle();
  if (!profile) notFound();

  const isMe = user?.id === profile.id;
  let souAdmin = false;
  let jaSigo = false;
  let bloqueei = false;
  if (user && !isMe) {
    const [{ data: me }, { data: f }, { data: b }] = await Promise.all([
      supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
      supabase.from("follows").select("followed_id")
        .eq("follower_id", user.id).eq("followed_id", profile.id).maybeSingle(),
      supabase.from("blocks").select("blocked_id")
        .eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle(),
    ]);
    souAdmin = Boolean(me?.is_admin);
    jaSigo = Boolean(f);
    bloqueei = Boolean(b);
  }
  const [{ count: seguidores }, { count: seguindo }] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true })
      .eq("followed_id", profile.id),
    supabase.from("follows").select("followed_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ]);
  const pct = coursePct(profile);
  const desde = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-12">
      <div className="card p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <Avatar url={profile.avatar_url} name={profile.nickname} size="lg" />
            <RankBadge rank={profile.rank_parts} />
          </div>
          <div className="w-full min-w-0 sm:flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              <span className="min-w-0 break-words">{displayName(profile)}</span>
              {profile.is_admin && <VerifiedBadge size="md" />}
              <span className="text-accent">- {pct}%</span>
            </h1>
            {souAdmin && profile.is_silenced && (
              <p className="mt-1 mr-2 inline-block rounded-full bg-gold/15 px-2 py-0.5 font-mono text-xs text-gold">
                conta silenciada
              </p>
            )}
            {profile.is_banned && (
              <p className="mt-1 inline-block rounded-full bg-danger/15 px-2 py-0.5 font-mono text-xs text-danger">
                conta suspensa
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-dim">member since {desde}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-dim">
              <Link href={`/u/${profile.nickname}/connections?aba=seguidores`}
                className="whitespace-nowrap hover:text-accent">
                <span className="text-white">{seguidores ?? 0}</span> seguidores
              </Link>
              <Link href={`/u/${profile.nickname}/connections?aba=seguindo`}
                className="whitespace-nowrap hover:text-accent">
                <span className="text-white">{seguindo ?? 0}</span> seguindo
              </Link>
            </div>
          </div>
        </div>

        {/* barra de progresso do curso */}
        <div className="mt-6">
          <div className="flex items-center justify-between font-mono text-xs text-dim">
            <span>progresso do curso</span>
            <span>{profile.chapters_done ?? 0} aulas concluidas</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-accent shadow-glow-sm" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {profile.four_aces_at && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
            <Trophy className="h-7 w-7 shrink-0 text-gold" />
            <div>
              <p className="font-display font-black text-gold">🎓 Graduate</p>
              <p className="text-xs text-dim">
                Aprovado na prova final — concluiu todo o curso com sucesso.
              </p>
            </div>
          </div>
        )}

        {profile.bio && (
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-dim">{profile.bio}</p>
        )}

        <div className="mt-8">
          {isMe ? (
            <Link href="/settings">
              <Button variant="ghost"><Settings className="h-4 w-4" /> Edit profile</Button>
            </Link>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-3">
              {!profile.is_banned && !bloqueei && <StartChatButton otherUserId={profile.id} />}
              <FollowButton userId={profile.id} initialFollowing={jaSigo} />
              <BlockButton userId={profile.id} initialBlocked={bloqueei} />
              {souAdmin && !profile.is_admin && (
                <>
                  <SilenceButton userId={profile.id} isSilenced={Boolean(profile.is_silenced)} />
                  <BanButton userId={profile.id} isBanned={Boolean(profile.is_banned)} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-dim">
              <Link href="/login" className="text-accent">Entre</Link> para enviar mensagem.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
