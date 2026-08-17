import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

/**
 * Header da página pública de planos, no mesmo padrão glass da Navbar
 * da landing, adaptado ao estado de autenticação: visitante vê
 * Entrar / Começar agora; usuário logado vê o retorno à plataforma.
 */
export async function PricingHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="glass fixed inset-x-0 top-0 z-40">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <BrandLogo href={user ? "/dashboard" : "/"} size="md" />
        {user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-dim hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Back to the platform</span>
            <span className="sm:hidden">Back</span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-dim hover:text-white">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="whitespace-nowrap px-4 text-sm sm:px-5">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start now</span>
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
