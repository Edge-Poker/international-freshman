"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExam, type ExamOutcome } from "@/actions/exams";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

export interface QuestaoCliente {
  id: string;
  dificuldade: "facil" | "media" | "dificil";
  pergunta: string;
  opcoes: string[];
}

const DIF: Record<string, { label: string; cls: string }> = {
  facil: { label: "easy", cls: "text-accent" },
  media: { label: "medium", cls: "text-gold" },
  dificil: { label: "hard", cls: "text-danger" },
};

export function ExamForm({
  parte,
  questoes,
  notaMinima,
}: {
  parte: number;
  questoes: QuestaoCliente[];
  notaMinima: number;
}) {
  const router = useRouter();
  const [respostas, setRespostas] = useState<(number | null)[]>(questoes.map(() => null));
  const [resultado, setResultado] = useState<ExamOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const completas = respostas.every((r) => r !== null);

  function enviar() {
    setError(null);
    start(async () => {
      const res = await submitExam(parte, respostas as number[]);
      if (res.error) setError(res.error);
      else {
        setResultado(res);
        router.refresh();
      }
    });
  }

  const conteudo = resultado ? (
    <div className="card p-8 text-center">
      {resultado.passed ? (
        <>
          <Trophy className="mx-auto h-12 w-12 text-accent" />
          <h2 className="mt-4 font-display text-2xl font-black sm:text-3xl">Passed!</h2>
        </>
      ) : (
        <>
          <XCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="mt-4 font-display text-2xl font-black sm:text-3xl">Not this time</h2>
        </>
      )}
      <p className="mt-2 text-dim">
        You got {resultado.acertos} of {resultado.total} questions right
      </p>
      <p className="mt-1 font-display text-4xl font-black sm:text-5xl">
        <span className={resultado.passed ? "text-accent" : "text-danger"}>{resultado.score}%</span>
      </p>
      <p className="mt-2 font-mono text-xs text-dim">passing score: {notaMinima}%</p>

      <div className="mx-auto mt-6 flex max-w-xs flex-wrap justify-center gap-2">
        {resultado.porQuestao.map((ok, i) => (
          <span key={i} title={`Question ${i + 1}`}
            className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs ${
              ok ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger"
            }`}>
            {i + 1}
          </span>
        ))}
      </div>

      {resultado.passed ? (
        <p className="mt-6 text-sm text-dim">
          {parte === 4
            ? "You earned the Graduate rank. It is already on your profile."
            : `Part ${parte + 1} is unlocked. Good luck.`}
        </p>
      ) : (
        <Button className="mt-6" onClick={() => {
          setResultado(null);
          setRespostas(questoes.map(() => null));
        }}>
          <RotateCcw className="h-4 w-4" /> Retake the exam
        </Button>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      {questoes.map((q, qi) => (
        <fieldset key={q.id} className="card p-5 sm:p-6">
          <legend className="sr-only">Question {qi + 1}</legend>
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold">
              <span className="mr-2 font-mono text-accent">{qi + 1}.</span>
              {q.pergunta}
            </p>
            <span className={`shrink-0 font-mono text-[10px] uppercase ${DIF[q.dificuldade].cls}`}>
              {DIF[q.dificuldade].label}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {q.opcoes.map((op, oi) => (
              <label key={oi}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  respostas[qi] === oi
                    ? "border-accent/60 bg-accent/10"
                    : "border-white/10 hover:border-white/25"
                }`}>
                <input
                  type="radio"
                  name={q.id}
                  checked={respostas[qi] === oi}
                  onChange={() =>
                    setRespostas((r) => r.map((v, i) => (i === qi ? oi : v)))
                  }
                  className="mt-0.5 accent-[#3B9EFF]"
                />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-dim">
          {respostas.filter((r) => r !== null).length}/{questoes.length} answered
        </p>
        <Button onClick={enviar} disabled={pending || !completas}>
          {pending ? "Grading..." : "Submit exam"}
        </Button>
      </div>
    </div>
  );

  return conteudo;
}
