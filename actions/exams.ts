"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProva, NOTA_MINIMA } from "@/content/exams";
import { curso } from "@/content/course";
import { canAccessExam } from "@/lib/access";

export interface ExamOutcome {
  score: number;
  acertos: number;
  total: number;
  passed: boolean;
  porQuestao: boolean[];
  error?: string;
}

/** Todas as aulas da parte N estão concluídas para este usuário? */
async function parteConcluida(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parte: number
) {
  const slugs = curso[parte - 1].chapters.map((c) => c.slug);
  const { data } = await supabase
    .from("lesson_progress")
    .select("status, chapters!inner(slug)")
    .eq("user_id", userId)
    .eq("status", "concluido")
    .in("chapters.slug", slugs);
  return (data?.length ?? 0) >= slugs.length;
}

export async function elegibilidadeProva(parte: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, motivo: "not authenticated" };

  if (parte > 1) {
    const { data: anterior } = await supabase
      .from("exam_results")
      .select("passed")
      .eq("user_id", user.id)
      .eq("part", parte - 1)
      .maybeSingle();
    if (!anterior?.passed) {
      return { ok: false, motivo: `Você precisa ser aprovado na Prova da Parte ${parte - 1} primeiro.` };
    }
  }
  const aulasOk = await parteConcluida(supabase, user.id, parte);
  if (!aulasOk) {
    return { ok: false, motivo: "Conclua todas as aulas desta parte antes de fazer a prova." };
  }
  return { ok: true, motivo: "" };
}

export async function submitExam(parte: number, respostas: number[]): Promise<ExamOutcome> {
  const vazio: ExamOutcome = { score: 0, acertos: 0, total: 0, passed: false, porQuestao: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...vazio, error: "You need to be logged in." };

  const prova = getProva(parte);
  if (!prova) return { ...vazio, error: "Exam not found." };
  if (!Array.isArray(respostas) || respostas.length !== prova.questoes.length) {
    return { ...vazio, error: "Answer every question before submitting." };
  }

  // gating de assinatura: sem acesso premium, não registra tentativa
  const acesso = await canAccessExam(parte, user.id, supabase);
  if (!acesso.allowed) {
    return { ...vazio, error: "As provas fazem parte da assinatura Premium." };
  }

  const eleg = await elegibilidadeProva(parte);
  if (!eleg.ok) return { ...vazio, error: eleg.motivo };

  const porQuestao = prova.questoes.map((q, i) => respostas[i] === q.correta);
  const acertos = porQuestao.filter(Boolean).length;
  const total = prova.questoes.length;
  const score = Math.round((acertos / total) * 100);
  const passed = score >= NOTA_MINIMA;

  const { data: atual } = await supabase
    .from("exam_results")
    .select("attempts, best_score, passed")
    .eq("user_id", user.id)
    .eq("part", parte)
    .maybeSingle();

  const aprovacaoInedita = passed && !atual?.passed;

  const { error } = await supabase.from("exam_results").upsert({
    user_id: user.id,
    part: parte,
    attempts: (atual?.attempts ?? 0) + 1,
    last_score: score,
    best_score: Math.max(score, atual?.best_score ?? 0),
    passed: Boolean(atual?.passed) || passed,
    ...(aprovacaoInedita ? { passed_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ...vazio, error: error.message };

  revalidatePath("/course");
  revalidatePath("/", "layout");
  return { score, acertos, total, passed, porQuestao };
}
