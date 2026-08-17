import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { Avatar } from "@/components/profile/avatar";
import { RankBadge } from "@/components/profile/rank-badge";
import { displayName } from "@/lib/format";
import type { Conversation, ChatProfile } from "@/types/chat";

export const metadata = { title: "Messages" };

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date().toDateString() === d.toDateString();
  return hoje
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default async function MessagesPage() {
  const { supabase, user } = await requirePremium();

  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  const conversations = (convs ?? []) as Conversation[];

  // perfis dos "outros" participantes, em uma consulta
  const otherIds = conversations.map((c) => (c.user_a === user!.id ? c.user_b : c.user_a));
  const profiles = new Map<string, ChatProfile>();
  if (otherIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, nickname, avatar_url, chapters_done, rank_parts")
      .in("id", otherIds);
    (data ?? []).forEach((p) => profiles.set(p.id, p as ChatProfile));
  }

  // conversas com mensagens recebidas não lidas
  const unread = new Set<number>();
  if (conversations.length) {
    const { data } = await supabase
      .from("messages")
      .select("conversation_id")
      .is("read_at", null)
      .neq("sender_id", user!.id)
      .in("conversation_id", conversations.map((c) => c.id));
    (data ?? []).forEach((m) => unread.add(m.conversation_id));
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Messages</h1>
      <p className="mt-1 text-dim">Your private conversations with other students.</p>

      <ul className="mt-6 space-y-2">
        {conversations.map((c) => {
          const other = profiles.get(c.user_a === user!.id ? c.user_b : c.user_a);
          const nova = unread.has(c.id);
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`}
                className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                <div className="flex shrink-0 items-center gap-2">
                  <Avatar url={other?.avatar_url} name={other?.nickname ?? other?.name} />
                  <RankBadge rank={other?.rank_parts} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{displayName(other)}</p>
                  <p className={`truncate text-sm ${nova ? "text-white" : "text-dim"}`}>
                    {c.last_message_preview ?? "Conversation started"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-xs text-dim">{fmt(c.last_message_at)}</span>
                  {nova && <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-glow-sm" />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {conversations.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <p className="font-semibold">No conversations yet</p>
          <p className="mt-2 text-sm text-dim">
            Click someone's nickname in the forum and use the Send message button.
          </p>
        </div>
      )}
    </main>
  );
}
