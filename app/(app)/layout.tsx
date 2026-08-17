import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, BookOpen, MessagesSquare, Send, Settings, Users, Star, Bell, LogOut, ShieldCheck, CreditCard, LifeBuoy } from "lucide-react";
import { UnreadBadge } from "@/components/chat/unread-badge";
import { NotifBadge } from "@/components/notif-badge";
import { nameWithPct } from "@/lib/format";
import { BrandLogo } from "@/components/brand-logo";
import { RankBadge } from "@/components/profile/rank-badge";
import { canAccessPremiumContent } from "@/lib/access";
import { LockedSidebarLink } from "@/components/locked-sidebar-link";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nickname, chapters_done, rank_parts, is_banned, is_admin")
    .eq("id", user.id)
    .single();
  if (profile?.is_banned) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="font-display text-2xl font-black">Account suspended</p>
        <p className="max-w-sm text-sm text-dim">
          This account was suspended by platform moderation and can no longer
          access the content or interact with the community.
        </p>
        <form action="/auth/signout" method="post">
          <button className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-dim hover:text-white">
            Sair
          </button>
        </form>
      </main>
    );
  }

  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", user.id);
  const { count: notifCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  // conta free (sem assinatura ativa e nao-admin) so acessa Dashboard,
  // Subscription e Settings; as demais abas ficam bloqueadas com popup.
  const acesso = await canAccessPremiumContent(user.id, supabase);
  const premium = acesso.allowed;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-white/5 bg-ink-900 p-5 md:flex">
        <BrandLogo size="md" />
        <nav className="mt-10 flex flex-1 flex-col gap-1 text-sm">
          <SidebarLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </SidebarLink>
          {premium ? (
            <>
              <SidebarLink href="/course" icon={<BookOpen className="h-4 w-4" />}>
                Course
              </SidebarLink>
              <SidebarLink href="/saved" icon={<Star className="h-4 w-4" />}>
                Saved
              </SidebarLink>
              <SidebarLink href="/forum" icon={<MessagesSquare className="h-4 w-4" />}>
                Forum
              </SidebarLink>
              <SidebarLink href="/messages" icon={<Send className="h-4 w-4" />}>
                Messages <UnreadBadge initial={unread ?? 0} />
              </SidebarLink>
              <SidebarLink href="/notifications" icon={<Bell className="h-4 w-4" />}>
                Notifications <NotifBadge initial={notifCount ?? 0} />
              </SidebarLink>
              <SidebarLink href="/students" icon={<Users className="h-4 w-4" />}>
                Students
              </SidebarLink>
            </>
          ) : (
            <>
              <LockedSidebarLink label="Course" icon={<BookOpen className="h-4 w-4" />} />
              <LockedSidebarLink label="Saved" icon={<Star className="h-4 w-4" />} />
              <LockedSidebarLink label="Forum" icon={<MessagesSquare className="h-4 w-4" />} />
              <LockedSidebarLink label="Messages" icon={<Send className="h-4 w-4" />} />
              <LockedSidebarLink label="Notifications" icon={<Bell className="h-4 w-4" />} />
              <LockedSidebarLink label="Students" icon={<Users className="h-4 w-4" />} />
            </>
          )}
          <SidebarLink href="/subscription" icon={<CreditCard className="h-4 w-4" />}>
            Subscription
          </SidebarLink>
          <SidebarLink href="/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </SidebarLink>
          <SidebarLink href="/support" icon={<LifeBuoy className="h-4 w-4" />}>
            Support
          </SidebarLink>
          {profile?.is_admin && (
            <SidebarLink href="/admin" icon={<ShieldCheck className="h-4 w-4 text-accent" />}>
              Admin
            </SidebarLink>
          )}
        </nav>
        <Link href="/settings"
          className="mb-4 block rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 transition-colors hover:border-accent/40">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs text-accent">{nameWithPct(profile)}</p>
            <RankBadge rank={profile?.rank_parts} size="sm" />
          </div>
          <p className="mt-0.5 text-[10px] text-dim">course progress</p>
        </Link>
        <form action="/auth/signout" method="post">
          <button className="flex items-center gap-2 text-sm text-dim hover:text-white">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </form>
      </aside>
      <MobileNav
        premium={premium}
        isAdmin={Boolean(profile?.is_admin)}
        unread={unread ?? 0}
        notifCount={notifCount ?? 0}
        profileLabel={nameWithPct(profile)}
        rank={profile?.rank_parts ?? null}
      />
      <div className="min-w-0 flex-1 pt-14 md:pl-60 md:pt-0">{children}</div>
    </div>
  );
}

function SidebarLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-dim transition-colors hover:bg-white/5 hover:text-white"
    >
      {icon} {children}
    </Link>
  );
}
