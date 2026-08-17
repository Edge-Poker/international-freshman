"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TriangleAlert } from "lucide-react";

type Estado = "verificando" | "pronto" | "invalido" | "salvo";

/**
 * Destino do link enviado por e-mail em "Recuperar senha".
 *
 * Importante sobre o fluxo: o cliente do Supabase já detecta o `code`
 * da URL e troca por sessão automaticamente. Por isso aqui NÃO
 * disputamos essa troca — primeiro verificamos se a sessão já existe,
 * e só tentamos a troca manual como plano B (e, se ela falhar,
 * conferimos a sessão de novo antes de declarar o link inválido).
 * O código só pode ser usado uma vez: duas tentativas em paralelo
 * fariam uma delas falhar sem motivo real.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  // um único cliente para toda a vida da página (evita trocas concorrentes)
  const supabase = useMemo(() => createClient(), []);
  const jaRodou = useRef(false);

  const [estado, setEstado] = useState<Estado>("verificando");
  const [motivo, setMotivo] = useState<string>("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // roda uma única vez, mesmo com a montagem dupla do modo de desenvolvimento
    if (jaRodou.current) return;
    jaRodou.current = true;

    let vivo = true;
    const limparUrl = () => window.history.replaceState({}, "", "/reset-password");
    const liberar = () => { if (vivo) { limparUrl(); setEstado("pronto"); } };

    // o SDK pode concluir a troca de forma assíncrona: ouvimos o evento
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) liberar();
    });

    (async () => {
      const url = new URL(window.location.href);

      // erro explícito devolvido pelo próprio Supabase
      const erroUrl =
        url.searchParams.get("error_description") ?? url.searchParams.get("error");
      if (erroUrl) {
        if (!vivo) return;
        setMotivo(decodeURIComponent(erroUrl.replace(/\+/g, " ")));
        setEstado("invalido");
        return;
      }

      // 1) a sessão já pode ter sido criada pelo próprio SDK
      const { data: atual } = await supabase.auth.getSession();
      if (atual.session) { liberar(); return; }

      const code = url.searchParams.get("code");
      const hash = window.location.hash;

      // 2) plano B: troca manual do código
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!vivo) return;
        if (!error) { liberar(); return; }

        // pode ter falhado só porque o SDK trocou primeiro: confere de novo
        const { data: depois } = await supabase.auth.getSession();
        if (depois.session) { liberar(); return; }

        setMotivo(
          "This link may have expired or already been used. Request a new one to continue."
        );
        setEstado("invalido");
        return;
      }

      // 3) fluxo alternativo: token no fragmento da URL — o SDK processa
      //    sozinho; damos um tempo curto para o evento chegar
      if (hash.includes("access_token")) {
        await new Promise((r) => setTimeout(r, 1200));
        if (!vivo) return;
        const { data: pos } = await supabase.auth.getSession();
        if (pos.session) { liberar(); return; }
      }

      if (!vivo) return;
      setMotivo("Open this page using the link we emailed you.");
      setEstado("invalido");
    })();

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("Your password must be at least 8 characters.");
      return;
    }
    if (senha !== confirma) {
      setErro("The two passwords do not match.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(
        error.message.includes("should be different")
          ? "Your new password must be different from the old one."
          : error.message
      );
      return;
    }

    setEstado("salvo");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1600);
  }

  if (estado === "verificando") {
    return (
      <div className="card p-5 sm:p-8">
        <h1 className="text-xl font-bold">Checking the link...</h1>
        <p className="mt-2 text-sm text-dim">Just a moment.</p>
      </div>
    );
  }

  if (estado === "invalido") {
    return (
      <div className="card p-5 sm:p-8">
        <TriangleAlert className="h-8 w-8 text-gold" />
        <h1 className="mt-3 text-xl font-bold">We could not open this link</h1>
        <p className="mt-2 text-sm text-dim">{motivo}</p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button className="w-full">Request a new link</Button>
        </Link>
        <p className="mt-4 text-center text-sm text-dim">
          <Link href="/login" className="text-accent">Back to log in</Link>
        </p>
      </div>
    );
  }

  if (estado === "salvo") {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-3 text-xl font-bold">Password updated</h1>
        <p className="mt-2 text-sm text-dim">
          All set. Taking you to the platform...
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-8">
      <h1 className="text-xl font-bold">Create a new password</h1>
      <p className="mt-1 text-sm text-dim">
        Choose a new password for your account.
      </p>

      <form onSubmit={salvar} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-dim">New password</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            required
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-dim">Repeat new password</span>
          <input
            type="password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
            required
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
          />
        </label>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <Button className="w-full" disabled={salvando}>
          {salvando ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
