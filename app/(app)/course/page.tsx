import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { curso } from "@/content/course";
import { NOTA_MINIMA } from "@/content/exams";
import { canAccessPremiumContent } from "@/lib/access";
import { LockedContent } from "@/components/course/locked-content";
import { CheckCircle2, Circle, CircleDot, Lock, GraduationCap, Trophy } from "lucide-react";

export const metadata = { title: "Course" };

export default async function CoursePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // gating: sem acesso premium, a estrutura fica visivel mas nada abre
  const premium = (await canAccessPremiumContent(undefined, supabase)).allowed;

  const [{ data: progress }, { data: exames }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("status, chapters(slug)")
      .eq("user_id", user!.id),
    supabase
      .from("exam_results")
      .select("part, passed, best_score, attempts")
      .eq("user_id", user!.id),
  ]);

  const statusBySlug = new Map(
    (progress ?? []).map((p) => [
      (p.chapters as unknown as { slug: string } | null)?.slug,
      p.status as string,
    ])
  );
  const exame = new Map((exames ?? []).map((e) => [e.part, e]));
  // parte N liberada se N = 1 ou se a prova da parte N-1 foi aprovada
  const liberada = (n: number) => n === 1 || Boolean(exame.get(n - 1)?.passed);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">The course</h1>
      <p className="mt-1 text-dim">
        Finish every chapter in a part and pass its exam ({NOTA_MINIMA}% to pass)
        to unlock the next one.
      </p>

      {curso.map((parte, i) => {
        const n = i + 1;
        const aberta = liberada(n);
        const concluidas = parte.chapters.filter(
          (c) => statusBySlug.get(c.slug) === "concluido"
        ).length;
        const todas = concluidas === parte.chapters.length;
        const resultado = exame.get(n);

        return (
          <section key={parte.slug} className={`mt-10 ${aberta ? "" : "opacity-60"}`}>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
              {parte.title} {!aberta && <Lock className="h-3.5 w-3.5 text-dim" />}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black">{parte.subtitle}</h2>
            {!aberta && (
              <p className="mt-1 text-sm text-dim">
                Locked — pass the Part {n - 1} exam to unlock.
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {parte.chapters.map((c) => {
                const st = statusBySlug.get(c.slug) ?? "nao_iniciado";
                const icone =
                  st === "concluido" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  ) : st === "em_andamento" ? (
                    <CircleDot className="h-5 w-5 shrink-0 text-gold" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-dim" />
                  );
                const conteudo = (
                  <>
                    {aberta ? icone : <Lock className="h-5 w-5 shrink-0 text-dim" />}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold sm:truncate">{c.title}</p>
                      <p className="line-clamp-2 text-sm text-dim sm:truncate">{c.summary}</p>
                    </div>
                    <span className="hidden shrink-0 font-mono text-xs text-dim sm:block">
                      {c.estMinutes} min
                    </span>
                  </>
                );
                return (
                  <li key={c.slug}>
                    {!aberta ? (
                      <div className="card flex items-center gap-4 p-4">{conteudo}</div>
                    ) : premium ? (
                      <Link href={`/course/${c.slug}`}
                        className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                        {conteudo}
                      </Link>
                    ) : (
                      <LockedContent title={c.title} description={c.summary}
                        className="card flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                        {conteudo}
                      </LockedContent>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* cartao da prova da parte */}
            <div className="mt-3">
              {resultado?.passed ? (
                <div className="card flex items-center gap-4 border-accent/40 p-4">
                  <Trophy className="h-5 w-5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Part {n} exam — passed</p>
                    <p className="font-mono text-xs text-dim">
                      best score {resultado.best_score}% · {resultado.attempts} attempt
                      {resultado.attempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Link href={`/exam/${n}`} className="shrink-0 font-mono text-xs text-accent hover:underline">
                    view exam
                  </Link>
                </div>
              ) : aberta && todas ? (
                (() => {
                  const cartaoProva = (
                    <>
                      <GraduationCap className="h-5 w-5 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          Part {n} exam — available
                          {n === 4 && " · final exam"}
                        </p>
                        <p className="font-mono text-xs text-dim">
                          6 questions · {NOTA_MINIMA}% to pass
                          {resultado && ` · best score so far: ${resultado.best_score}%`}
                        </p>
                      </div>
                    </>
                  );
                  return premium ? (
                    <Link href={`/exam/${n}`}
                      className="card flex items-center gap-4 border-gold/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm">
                      {cartaoProva}
                    </Link>
                  ) : (
                    <LockedContent title={`Part ${n} exam`}
                      description={`6 questions · ${NOTA_MINIMA}% to pass and unlock the next part.`}
                      className="card flex items-center gap-4 border-gold/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm">
                      {cartaoProva}
                    </LockedContent>
                  );
                })()
              ) : (
                <div className="card flex items-center gap-4 p-4 opacity-70">
                  <Lock className="h-5 w-5 shrink-0 text-dim" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Part {n} exam</p>
                    <p className="font-mono text-xs text-dim">
                      {aberta
                        ? `finish the ${parte.chapters.length} chapters in this part to unlock (${concluidas}/${parte.chapters.length})`
                        : `unlock this part first`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
