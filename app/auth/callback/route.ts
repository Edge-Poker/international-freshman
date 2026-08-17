/**
 * Retorno dos links enviados por e-mail (confirmação de cadastro,
 * magic link). NÃO é login social — essa opção foi removida.
 *
 * Detalhe importante do fluxo do Supabase: quando o usuário clica no
 * link, o próprio Supabase JÁ valida o e-mail antes de redirecionar
 * para cá. O que fazemos aqui é apenas trocar o código por uma sessão,
 * para a pessoa entrar logada.
 *
 * Por isso, falhar nesta troca NÃO significa que a confirmação falhou.
 * Ela pode falhar por motivos banais — o link foi aberto em outro
 * navegador, ou o app de e-mail pré-carregou o endereço e consumiu o
 * código de uso único. Nesses casos a conta está confirmada e só falta
 * fazer login, e é isso que informamos, em vez de dizer "link expirado".
 */
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const ir = (rota: string) => NextResponse.redirect(`${origin}${rota}`);

  // erro explícito devolvido pelo Supabase: aí sim o link é inválido
  const erroUrl = searchParams.get("error_description") ?? searchParams.get("error");
  if (erroUrl) return ir("/login?confirmacao=expirada");

  const supabase = await createClient();

  // Fluxo com token_hash (usado quando o modelo de e-mail do Supabase
  // aponta direto para cá com token_hash + type).
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error
      ? ir("/login?confirmacao=expirada")
      : ir("/dashboard?confirmacao=ok");
  }

  // Fluxo padrão: código de uso único trocado por sessão.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return ir("/dashboard?confirmacao=ok");

    // A validação do e-mail já ocorreu antes deste ponto; só a sessão
    // não pôde ser criada. A conta está ativa: é só entrar.
    return ir("/login?confirmacao=confirmada");
  }

  return ir("/login?confirmacao=invalida");
}
