import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChapter, allChapters } from "@/content/course";
import { canAccessChapter } from "@/lib/access";
import { Markdown } from "@/components/course/markdown";
import { ReaderControls } from "@/components/course/reader-controls";
import { ChapterActions } from "@/components/course/chapter-actions";
import { StudyTimer } from "@/components/course/study-timer";
import type { ChapterStatus } from "@/types/course";
import { ArrowLeft, ArrowRight, Lock, Crown } from "lucide-react";

export function generateStaticParams() {
  return allChapters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getChapter(slug);
  if (!data) return {};
  return { title: data.chapter.title, description: data.chapter.summary };
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getChapter(slug);
  if (!data) notFound();
  const { chapter, prev, next, index, total } = data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // gating de assinatura: capitulo nao-gratuito exige acesso premium.
  // A estrutura e visivel no indice; o acesso direto por URL e barrado aqui.
  const acesso = await canAccessChapter(slug, user?.id, supabase);
  if (!acesso.allowed) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <Lock className="h-6 w-6 text-accent" />
        </span>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Premium content
        </p>
        <h1 className="mt-2 font-display text-2xl font-black">{chapter.title}</h1>
        <p className="mt-2 text-dim">
          This chapter is part of the Premium plan. Subscribe to unlock the
          full course, the exams and all the material.
        </p>
        <Link href="/pricing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 shadow-glow-sm hover:shadow-glow">
          <Crown className="h-4 w-4" /> See plans
        </Link>
      </main>
    );
  }

  // partes 2, 3 e 4 exigem aprovacao na prova da parte anterior
  const parteNum = Number(chapter.partSlug.split("-")[1]);
  if (parteNum > 1 && user) {
    const { data: aprovada } = await supabase
      .from("exam_results")
      .select("passed")
      .eq("user_id", user.id)
      .eq("part", parteNum - 1)
      .maybeSingle();
    if (!aprovada?.passed) {
      return (
        <main className="mx-auto max-w-2xl px-5 py-16 text-center">
          <Lock className="mx-auto h-10 w-10 text-dim" />
          <h1 className="mt-4 font-display text-2xl font-black">Chapter locked</h1>
          <p className="mt-2 text-dim">
            To open {chapter.partTitle}, you need to pass the Part{" "}
            {parteNum - 1} exam (70% to pass).
          </p>
          <Link
            href={`/exam/${parteNum - 1}`}
            className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 shadow-glow-sm hover:shadow-glow"
          >
            Go to the Part {parteNum - 1} exam
          </Link>
        </main>
      );
    }
  }

  const { data: dbChapter } = await supabase
    .from("chapters").select("id").eq("slug", slug).maybeSingle();

  let status: ChapterStatus = "nao_iniciado";
  let favorited = false;
  if (user && dbChapter) {
    const [{ data: prog }, { data: fav }] = await Promise.all([
      supabase.from("lesson_progress").select("status")
        .eq("user_id", user.id).eq("chapter_id", dbChapter.id).maybeSingle(),
      supabase.from("favorites").select("chapter_id")
        .eq("user_id", user.id).eq("chapter_id", dbChapter.id).maybeSingle(),
    ]);
    if (prog) status = prog.status as ChapterStatus;
    favorited = Boolean(fav);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <StudyTimer slug={chapter.slug} />
      {/* breadcrumb + controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="breadcrumb" className="min-w-0 font-mono text-xs text-dim">
          <Link href="/course" className="hover:text-accent">Course</Link>
          {" / "}
          <span>{chapter.partTitle}</span>
          {" · "}
          <span>chapter {index + 1} of {total}</span>
        </nav>
        <ReaderControls />
      </div>

      <h1 className="mt-6 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
        {chapter.title}
      </h1>
      <p className="mt-2 text-dim">{chapter.summary}</p>
      <p className="mt-1 font-mono text-xs text-dim">~{chapter.estMinutes} min read</p>

      <article className="mt-10">
        {chapter.body ? (
          <Markdown source={chapter.body} />
        ) : (
          <div className="card p-8 text-center">
            <p className="font-semibold">Content in preparation</p>
            <p className="mt-2 text-sm text-dim">
              The text of this chapter has not been loaded yet. Structure, progress
              tracking and navigation already work.
            </p>
          </div>
        )}
      </article>

      <div className="mt-12 border-t border-white/10 pt-8">
        <ChapterActions slug={chapter.slug} status={status} favorited={favorited} />
      </div>

      {/* navegacao anterior/proximo */}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/course/${prev.slug}`} className="card flex items-center gap-3 p-4 hover:border-accent/40">
            <ArrowLeft className="h-4 w-4 shrink-0 text-dim" />
            <span className="min-w-0">
              <span className="block font-mono text-xs text-dim">Previous</span>
              <span className="block truncate text-sm font-semibold">{prev.title}</span>
            </span>
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/course/${next.slug}`} className="card flex items-center justify-end gap-3 p-4 text-right hover:border-accent/40">
            <span className="min-w-0">
              <span className="block font-mono text-xs text-dim">Next</span>
              <span className="block truncate text-sm font-semibold">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-dim" />
          </Link>
        )}
      </nav>
    </main>
  );
}
