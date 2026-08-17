"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/actions/forum";
import { Flag, X } from "lucide-react";

const MOTIVOS = [
  "Spam or advertising",
  "Offensive or aggressive content",
  "Harassment of another user",
  "Inappropriate content",
  "Other",
];

/**
 * Botão de denunciar conteúdo do fórum (tópico ou resposta). Abre um popup
 * com motivos; envia para a tabela reports, que o painel admin já lê e filtra.
 */
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "topic" | "post" | "comment";
  targetId: number;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalhe, setDetalhe] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    setMsg(null);
    const reason = motivo === "Outro" ? detalhe.trim() : motivo + (detalhe.trim() ? ` — ${detalhe.trim()}` : "");
    start(async () => {
      const res = await reportContent(targetType, targetId, reason);
      if (res?.error) setMsg(res.error);
      else {
        setMsg(res.already ? "You already reported this content." : "Report sent. Thank you.");
        setTimeout(() => setOpen(false), 1400);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setMsg(null); }}
        className="inline-flex items-center gap-1 text-dim/70 transition-colors hover:text-danger"
        title="Report"
      >
        <Flag className="h-3.5 w-3.5" /> Denunciar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-5"
          style={{ background: "rgba(8,11,18,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div className="card relative w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Fechar" onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-dim hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <h2 className="flex items-center gap-2 font-display text-lg font-black">
              <Flag className="h-4 w-4 text-danger" /> Report content
            </h2>
            <p className="mt-1 text-sm text-dim">
              Your report goes to moderation and stays anonymous to other users.
            </p>

            <div className="mt-4 space-y-2">
              {MOTIVOS.map((m) => (
                <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm transition-colors ${
                  motivo === m ? "border-accent/60 bg-accent/10" : "border-white/10 hover:border-white/25"
                }`}>
                  <input type="radio" name="motivo" checked={motivo === m}
                    onChange={() => setMotivo(m)} className="accent-[#00FF88]" />
                  {m}
                </label>
              ))}
            </div>

            <textarea
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              rows={2}
              placeholder={motivo === "Other" ? "Describe the reason..." : "Details (optional)"}
              className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-ink-900 p-3 text-sm outline-none focus:border-accent"
            />

            {msg && <p className={`mt-2 text-sm ${msg.includes("enviada") ? "text-accent" : "text-gold"}`}>{msg}</p>}

            <button
              onClick={enviar}
              disabled={pending}
              className="mt-4 w-full rounded-xl bg-danger px-5 py-3 font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Sending..." : "Send report"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
