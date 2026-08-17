import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProva, NOTA_MINIMA } from "@/content/exams";
import { elegibilidadeProva } from "@/actions/exams";
import { canAccessExam } from "@/lib/access";
import { ExamForm, type QuestaoCliente } from "@/components/exam/exam-form";
import { ArrowLeft, Lock, CheckCircle2, Crown, RotateCcw } from "lucide-react";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ part: string }>;
  searchParams: Promise<{ retake?: string }>;
}) {
  const { part: parteStr } = await params;
  const { retake } = await searchParams;
  const parte = Number(parteStr);
  if (![1, 2, 3, 4].includes(parte)) notFound();
  const prova = getProva(parte)!;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // gating de assinatura: prova exige acesso premium (defesa por URL)
  const acesso = await canAccessExam(parte, user?.id, supabase);
  if (!acesso.allowed) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <Lock className="h-6 w-6 text-accent" />
        </span>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Premium content
        </p>
        <h1 className="mt-2 font-display text-2xl font-black">Part {parte} Exam</h1>
        <p className="mt-2 text-dim">
          Exams are part of the Premium plan. Subscribe to unlock the full course
          and track how much you have actually learned.
        </p>
        <Link href="/pricing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 shadow-glow-sm hover:shadow-glow">
          <Crown className="h-4 w-4" /> See plans
        </Link>
      </main>
    );
  }

  const { data: resultado } = await supabase
    .from("exam_results")
    .select("passed, best_score, attempts")
    .eq("user_id", user!.id)
    .eq("part", parte)
    .maybeSingle();

  const eleg = await elegibilidadeProva(parte);

  // remove a resposta correta antes de enviar ao navegador
  const questoesCliente: QuestaoCliente[] = prova.questoes.map(
    ({ id, dificuldade, pergunta, opcoes }) => ({ id, dificuldade, pergunta, opcoes })
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <Link href="/course" className="inline-flex items-center gap-2 text-sm text-dim hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>
      <h1 className="mt-4 font-display text-2xl font-black tracking-tight sm:text-3xl">{prova.titulo}</h1>
      <p className="mt-1 text-dim">{prova.descricao}</p>
      <p className="mt-2 font-mono text-xs text-dim">
        {prova.questoes.length} questions · {NOTA_MINIMA}% to pass · retake as many times as you need
        {resultado && ` · best score: ${resultado.best_score}% · attempts: ${resultado.attempts}`}
      </p>

      <div className="mt-8">
        {resultado?.passed && retake !== "1" ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
            <p className="mt-3 font-display text-2xl font-black">You already passed this exam</p>
            <p className="mt-2 text-sm text-dim">
              Best score: <span className="text-accent">{resultado.best_score}%</span>
              {parte < 4
                ? ` — Part ${parte + 1} is unlocked.`
                : " — the Graduate rank is on your profile."}
            </p>
            <Link
              href={`/exam/${parte}?retake=1`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent/50 hover:text-accent"
            >
              <RotateCcw className="h-4 w-4" /> Retake the exam
            </Link>
            <p className="mt-3 font-mono text-[11px] text-dim">
              your pass and best score are kept — retaking never takes anything away
            </p>
          </div>
        ) : !eleg.ok ? (
          <div className="card p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-dim" />
            <p className="mt-3 font-semibold">Exam locked</p>
            <p className="mt-2 text-sm text-dim">{eleg.motivo}</p>
          </div>
        ) : (
          <ExamForm parte={parte} questoes={questoesCliente} notaMinima={NOTA_MINIMA} />
        )}
      </div>
    </main>
  );
}
