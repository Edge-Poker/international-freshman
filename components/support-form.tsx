"use client";

import { useState, useTransition } from "react";
import { sendSupportMessage } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send } from "lucide-react";

const ASSUNTOS = [
  "Problema com pagamento ou assinatura",
  "I cannot access some content",
  "Bug or platform error",
  "Question about the course",
  "Suggestion",
  "Outro",
];

/** Formulário de contato com o suporte, vinculado à conta do usuário. */
export function SupportForm() {
  const [assunto, setAssunto] = useState(ASSUNTOS[0]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, start] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const res = await sendSupportMessage({ subject: assunto, body: mensagem });
      if (res?.error) setErro(res.error);
      else {
        setEnviado(true);
        setMensagem("");
      }
    });
  }

  if (enviado) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
        <p className="mt-3 font-display text-xl font-black">Message sent</p>
        <p className="mt-2 text-sm text-dim">
          We got your message and will reply to your account email as soon as
          we can.
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => setEnviado(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="card p-5 sm:p-6">
      <label className="block text-sm">
        <span className="text-dim">Assunto</span>
        <select
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-accent"
        >
          {ASSUNTOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-dim">Your message</span>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={6}
          placeholder="Tell us what happened in as much detail as you can — what you were trying to do, what appeared on screen, and where in the platform."
          className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-ink-900 p-3 text-sm outline-none focus:border-accent"
        />
      </label>

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] text-dim">
          enviamos a resposta para o e-mail da sua conta
        </p>
        <Button disabled={pending}>
          <Send className="h-4 w-4" /> {pending ? "Enviando..." : "Send"}
        </Button>
      </div>
    </form>
  );
}
