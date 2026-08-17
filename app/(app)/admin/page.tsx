import Link from "next/link";
import {
  ArrowRight, CalendarPlus, CircleAlert, CircleX, Clock3, Crown,
  MicOff, ShieldBan, Sparkles, UserPlus, Users, Wallet,
} from "lucide-react";
import { getDashboardStats } from "@/lib/admin";
import { StatCard } from "@/components/admin/ui";

export const metadata = { title: "Admin · Dashboard" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold">Could not load the metrics</p>
        <p className="mt-2 text-sm text-dim">
          Verifique se a migration 0015 foi aplicada no Supabase e recarregue.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* usuários */}
      <h2 className="font-display text-xl font-black">Users</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5 text-accent" />}
          label="Total users" value={stats.total_users}
          sub={`${stats.plan_free} free · ${stats.plan_pro} monthly · ${stats.plan_vitalicio} lifetime`} />
        <StatCard icon={<Sparkles className="h-5 w-5 text-accent" />}
          label="Active users" value={stats.active_users_7d} sub="logged in within 7 days" />
        <StatCard icon={<UserPlus className="h-5 w-5 text-gold" />}
          label="New today" value={stats.new_today} sub="cadastros desde 00h" />
        <StatCard icon={<CalendarPlus className="h-5 w-5 text-gold" />}
          label="New this week" value={stats.new_week} sub="signups within 7 days" />
      </div>

      {/* assinaturas */}
      <h2 className="mt-10 font-display text-xl font-black">Assinaturas</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<Wallet className="h-5 w-5 text-accent" />}
          label="Active" value={stats.subs_active} sub="recurring and current" />
        <StatCard icon={<Clock3 className="h-5 w-5 text-gold" />} accent="gold"
          label="Pending" value={stats.subs_pending} sub="past_due e incomplete" />
        <StatCard icon={<CircleX className="h-5 w-5 text-dim" />} accent="dim"
          label="Canceled" value={stats.subs_canceled} sub="ended by user or admin" />
        <StatCard icon={<CircleAlert className="h-5 w-5 text-danger" />} accent="danger"
          label="Expired" value={stats.subs_expired} sub="period ended" />
        <StatCard icon={<Crown className="h-5 w-5 text-gold" />} accent="gold"
          label="Lifetime" value={stats.subs_lifetime} sub="acesso permanente" />
      </div>

      {/* moderação em um relance */}
      <h2 className="mt-10 font-display text-xl font-black">Moderation</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard icon={<ShieldBan className="h-5 w-5 text-danger" />} accent="danger"
          label="Banned accounts" value={stats.banned} sub="sem acesso à plataforma" />
        <StatCard icon={<MicOff className="h-5 w-5 text-gold" />} accent="gold"
          label="Silenced accounts" value={stats.silenced} sub="can read, cannot post" />
      </div>

      {/* atalhos */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/admin/users", label: "Manage users" },
          { href: "/admin/subscriptions", label: "View subscriptions" },
          { href: "/admin/moderation", label: "Moderation queue" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="card group flex items-center justify-between p-4 transition-colors hover:border-accent/40">
            <span className="text-sm font-semibold">{a.label}</span>
            <ArrowRight className="h-4 w-4 text-dim transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </div>
  );
}
