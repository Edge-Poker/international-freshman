"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MailCheck, RotateCcw } from "lucide-react";
import { useCaptcha } from "@/components/captcha";


/**
 * Traduz qualquer erro em uma frase legível.
 * O Supabase às vezes devolve um erro sem mensagem (o corpo chega como
 * "{}") — acontece, por exemplo, quando o envio do e-mail de confirmação
 * falha. Sem este tratamento, a tela mostrava chaves vazias ao usuário.
 */
function mensagemDeErro(err: unknown): string {
  const bruto =
    typeof err === "string"
      ? err
      : ((err as { message?: string })?.message ?? "");

  const texto = bruto.trim();

  if (!texto || texto === "{}" || texto === "[object Object]") {
    return "We could not finish right now — sending the confirmation email failed. Try again in a moment; if it keeps happening, contact support.";
  }
  if (/sending confirmation|sending email|smtp|email address .* invalid/i.test(texto)) {
    return "We could not send the confirmation email. Please try again in a moment.";
  }
  if (texto === "Invalid login credentials") return "Incorrect email or password";
  if (/already registered/i.test(texto)) {
    return "That email already has an account. Log in or reset your password.";
  }
  if (/duplicate|unique/i.test(texto)) {
    return "That nickname is already taken, pick another one";
  }
  if (/security purposes/i.test(texto)) {
    return "Please wait a few seconds before trying again.";
  }
  return texto;
}

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  nickname: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "Nickname: 3 to 20 letters, numbers or _ (no spaces)")
    .optional(),
});

export function AuthForm({ mode }: { mode: "login" | "cadastro" }) {
  // um único cliente por montagem, para não recriar a cada render
  const supabase = useMemo(() => createClient(), []);
  const captcha = useCaptcha();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** e-mail que aguarda confirmação (mostra a tela "confira seu e-mail") */
  const [aguardando, setAguardando] = useState<string | null>(null);
  /** login barrado por e-mail não confirmado */
  const [naoConfirmado, setNaoConfirmado] = useState<string | null>(null);
  const [reenvio, setReenvio] = useState<string | null>(null);

  /** endereço para onde o link do e-mail deve voltar */
  function redirectTo() {
    return `${location.origin}/auth/callback`;
  }

  async function reenviarConfirmacao(email: string) {
    setReenvio(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo(), captchaToken: captcha.token },
    });
    captcha.reset();
    setReenvio(error ? mensagemDeErro(error) : "SENT:We sent a new confirmation email.");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNaoConfirmado(null);

    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (mode === "cadastro" && !parsed.data.nickname) {
      setError("Choose a nickname");
      return;
    }

    setLoading(true);
    const { email, password, name, nickname } = parsed.data;

    // nickname único (checagem amigável antes de criar a conta)
    if (mode === "cadastro" && nickname) {
      // consulta via função segura: perfis não são mais legíveis por
      // quem ainda não tem sessão (ver migration 0023)
      const { data: livre } = await supabase.rpc("nickname_disponivel", {
        p_nick: nickname,
      });
      if (livre === false) {
        setLoading(false);
        setError("That nickname is already taken, pick another one");
        return;
      }
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: captcha.token },
      });
      captcha.reset();
      setLoading(false);
      if (error) {
        // e-mail ainda não confirmado: oferecemos reenviar o link
        if (/not confirmed|Email not confirmed/i.test(error.message)) {
          setNaoConfirmado(email);
          return;
        }
        setError(mensagemDeErro(error));
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // cadastro
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, nickname },
        emailRedirectTo: redirectTo(),
        captchaToken: captcha.token,
      },
    });
    captcha.reset();
    setLoading(false);

    if (error) {
      setError(mensagemDeErro(error));
      return;
    }

    // o Supabase devolve um usuário sem identidades quando o e-mail já existe
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("That email already has an account. Log in or reset your password.");
      return;
    }

    // com confirmação de e-mail ativa não vem sessão: é preciso confirmar antes
    if (!data.session) {
      setAguardando(email);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // ---------- tela: confira seu e-mail ----------
  if (aguardando) {
    return (
      <div className="card p-5 text-center sm:p-8">
        <MailCheck className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 text-xl font-bold">Confirm your email</h1>
        <p className="mt-2 text-sm text-dim">
          We sent a confirmation link to{" "}
          <span className="break-all text-white">{aguardando}</span>. Open the email
          and click the link to activate your account.
        </p>
        <p className="mt-3 text-xs text-dim">
          Did not arrive? Check your spam or promotions folder.
        </p>

        <Button
          variant="ghost"
          className="mt-6 w-full"
          onClick={() => reenviarConfirmacao(aguardando)}
        >
          <RotateCcw className="h-4 w-4" /> Resend email
        </Button>
        {reenvio && (
          <p className={`mt-2 text-sm ${reenvio.startsWith("SENT:") ? "text-accent" : "text-gold"}`}>
            {reenvio.replace(/^SENT:/, "")}
          </p>
        )}

        <p className="mt-6 text-sm text-dim">
          Already confirmed? <Link href="/login" className="text-accent">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-8">
      <h1 className="text-xl font-bold">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "cadastro" && (
          <>
            <Field label="Name" name="name" type="text" autoComplete="name" />
            <Field label="Nickname (your @ handle in posts)" name="nickname" type="text" autoComplete="off" />
          </>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* login barrado por falta de confirmação */}
        {naoConfirmado && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm text-gold">
              Your account is not confirmed yet. Open the link we sent to{" "}
              <span className="break-all">{naoConfirmado}</span>.
            </p>
            <button
              type="button"
              onClick={() => reenviarConfirmacao(naoConfirmado)}
              className="mt-2 font-mono text-xs text-accent hover:underline"
            >
              resend confirmation email
            </button>
            {reenvio && <p className="mt-1 text-xs text-dim">{reenvio}</p>}
          </div>
        )}

        {captcha.widget}

        <Button className="w-full" disabled={loading || !captcha.pronto}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-dim">
        {mode === "login" ? (
          <>
            No account? <Link href="/signup" className="text-accent">Sign up</Link>
            {" · "}
            <Link href="/forgot-password" className="hover:text-white">Forgot password</Link>
          </>
        ) : (
          <>Already have an account? <Link href="/login" className="text-accent">Log in</Link></>
        )}
      </p>
    </div>
  );
}

function Field(props: { label: string; name: string; type: string; autoComplete?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-dim">{props.label}</span>
      <input
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        required={props.name !== "name"}
        maxLength={props.name === "nickname" ? 20 : undefined}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}
