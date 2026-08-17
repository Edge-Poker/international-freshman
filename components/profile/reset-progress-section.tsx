"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetMyProgress } from "@/actions/progress-reset";

/**
 * Zona de reinício do progresso na página de configurações.
 * Confirmação em dois passos (abre um painel de confirmação explícito
 * antes de executar), no mesmo espírito das ações destrutivas do
 * painel admin. Deixa claro o que é apagado e o que é preservado.
 */
export function ResetProgressSection() {
  const router = useRouter();
  const [armado, setArmado] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function executar() {
    setError(null);
    start(async () => {
      const res = await resetMyProgress();
      if (res?.error) setError(res.error);
      else {
        setOk(true);
        setArmado(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="card mt-6 border-danger/30 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-black">
        <RotateCcw className="h-5 w-5 text-danger" /> Reset my progress
      </h2>
      <p className="mt-2 text-sm text-dim">
        Erases <span className="text-white">only</span> your course progress:
        completed chapters, exams and attempts, XP, level, achievements,
        saved items and reading history. Your account, subscription, posts,
        comments, followers, following, profile and settings stay intact.
        This cannot be undone.
      </p>

      {ok && (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          Progress reset. You are starting from scratch.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!armado ? (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => { setArmado(true); setOk(false); }}>
            Reset progress
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" /> Are you sure? This erases all your progress.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="danger" disabled={pending} onClick={executar}>
              {pending ? "Resetting..." : "Yes, reset everything"}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setArmado(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
