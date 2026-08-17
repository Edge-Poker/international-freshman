import { ShieldCheck, ShieldX } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "Admin" };

/**
 * Guarda de acesso do painel: a validação acontece AQUI, no
 * servidor, para todas as rotas /admin/* — além dela, cada RPC
 * revalida is_admin no banco. Usuário comum que digitar a rota
 * manualmente recebe "Access denied".
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <ShieldX className="h-10 w-10 text-danger" />
        <p className="font-display text-2xl font-black">Access denied</p>
        <p className="max-w-sm text-sm text-dim">
          This area is restricted to platform administrators.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <ShieldCheck className="h-5 w-5 text-accent" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Admin</h1>
          <p className="mt-0.5 text-sm text-dim">
            Users, subscriptions, moderation and audit logs.
          </p>
        </div>
      </div>
      <AdminNav />
      <div className="mt-8">{children}</div>
    </main>
  );
}
