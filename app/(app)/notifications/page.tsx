import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePremium } from "@/lib/require-premium";
import { Bell, AtSign, Reply } from "lucide-react";

export const metadata = { title: "Notifications" };

function quando(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

export default async function NotificationsPage() {
  const { supabase, user } = await requirePremium();

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, title, body, url, read, kind, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // marca tudo como lido ao abrir a pagina
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user!.id)
    .eq("read", false);

  const lista = notifs ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
      <p className="mt-1 text-dim">When someone mentions your @ or replies to your forum post.</p>

      <ul className="mt-6 space-y-2">
        {lista.map((n) => {
          const icone = n.kind === "reply"
            ? <Reply className="h-4 w-4 text-gold" />
            : <AtSign className="h-4 w-4 text-accent" />;
          const inner = (
            <div className={`card flex gap-4 p-4 ${n.read ? "" : "border-accent/40"}`}>
              <span className="mt-0.5 shrink-0">{icone}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {n.title}
                  {!n.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-accent" />}
                </p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-dim">{n.body}</p>}
                <p className="mt-1 font-mono text-xs text-dim">{quando(n.created_at)}</p>
              </div>
            </div>
          );
          return (
            <li key={n.id}>
              {n.url ? <Link href={n.url} className="block transition-transform hover:-translate-y-0.5">{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>

      {lista.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-dim" />
          <p className="mt-3 font-semibold">Nothing here yet</p>
          <p className="mt-2 text-sm text-dim">
            When someone mentions your @nickname or replies to your post, it shows up here.
          </p>
        </div>
      )}
    </main>
  );
}
