"use client";

import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

/**
 * CAPTCHA (Cloudflare Turnstile) para as telas de autenticação.
 *
 * É OPCIONAL de propósito: só entra em ação se a variável
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY existir. Sem ela, o site funciona
 * exatamente como antes — nenhum desafio na tela e nenhum token
 * enviado. Isso permite preparar o código com antecedência e ligar a
 * proteção depois, no painel do Supabase, sem risco de derrubar o
 * cadastro no intervalo.
 *
 * Importante: o Supabase valida o token no servidor. Se a proteção
 * estiver ligada lá e o site não enviar o token, TODO login e cadastro
 * falha. Por isso as duas pontas precisam ser ligadas juntas.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function useCaptcha() {
  const ref = useRef<TurnstileInstance | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const ativo = Boolean(SITE_KEY);

  const widget = ativo ? (
    <div className="flex justify-center">
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY as string}
        options={{ theme: "dark", language: "pt-br" }}
        onSuccess={(t) => setToken(t)}
        onExpire={() => setToken(null)}
        onError={() => setToken(null)}
      />
    </div>
  ) : null;

  return {
    /** o desafio está configurado neste ambiente? */
    ativo,
    /** prova a ser enviada ao Supabase (undefined quando desativado) */
    token: token ?? undefined,
    /** elemento visual a ser posicionado no formulário */
    widget,
    /** limpa o desafio após cada envio (o token é de uso único) */
    reset: () => {
      ref.current?.reset();
      setToken(null);
    },
    /** pode enviar o formulário? (sempre true quando desativado) */
    pronto: !ativo || Boolean(token),
  };
}
