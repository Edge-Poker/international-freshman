import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { MessageForm } from "@/components/chat/message-form";
import { AutoRefresh } from "@/components/chat/auto-refresh";
import { DeleteMessageButton } from "@/components/chat/delete-message-button";
import { Attachments } from "@/components/forum/attachments";
import { displayName } from "@/lib/format";
import type { Conversation, ChatProfile, Message } from "@/types/chat";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const convId = Number(id);
  if (!Number.isFinite(convId)) notFound();

  const { supabase, user } = await requirePremium();

  // a RLS já limita a conversas em que o usuário participa
  const { data: conv } = await supabase
    .from("conversations").select("*").eq("id", convId).maybeSingle();
  if (!conv) notFound();
  const c = conv as Conversation;

  const otherId = c.user_a === user!.id ? c.user_b : c.user_a;
  const { data: other } = await supabase
    .from("profiles")
    .select("id, name, nickname, avatar_url, chapters_done, rank_parts")
    .eq("id", otherId)
    .maybeSingle();
  const o = other as ChatProfile | null;

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (msgs ?? []) as Message[];

  // marca como lidas as mensagens recebidas
  await supabase.rpc("mark_conversation_read", { p_conversation: convId });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-4 sm:px-5 sm:py-6">
      <AutoRefresh seconds={5} />

      {/* cabecalho */}
      <div className="glass sticky top-14 z-10 flex items-center gap-3 rounded-2xl p-3 md:top-0">
        <Link href="/messages" aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-dim hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar url={o?.avatar_url} name={o?.nickname ?? o?.name} size="sm" />
        <RankBadge rank={o?.rank_parts} size="sm" />
        {o?.nickname ? (
          <Link href={`/u/${o.nickname}`} className="font-semibold hover:text-accent">
            {displayName(o)}
          </Link>
        ) : (
          <span className="font-semibold">{displayName(o)}</span>
        )}
      </div>

      {/* mensagens */}
      <div className="flex-1 space-y-3 py-6">
        {messages.map((m) => {
          const minha = m.sender_id === user!.id;
          const dentroDe24h = Date.now() - new Date(m.created_at).getTime() < 24 * 60 * 60 * 1000;
          return (
            <div key={m.id} className={cn("flex", minha ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                minha
                  ? "rounded-br-md bg-accent/15 text-white"
                  : "rounded-bl-md border border-white/10 bg-ink-800"
              )}>
                {m.body && <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                <Attachments images={m.images} />
                <p className="mt-1 flex items-center justify-end gap-2 font-mono text-[10px] text-dim">
                  {minha && dentroDe24h && (
                    <DeleteMessageButton messageId={m.id} conversationId={c.id} />
                  )}
                  <span>{hora(m.created_at)}</span>
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-dim">
            Conversation started. Say hi to {displayName(o)}.
          </p>
        )}
      </div>

      <MessageForm conversationId={c.id} />
    </main>
  );
}
