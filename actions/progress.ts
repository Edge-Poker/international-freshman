"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChapterStatus } from "@/types/course";

/**
 * Marca o status de um capitulo para o usuário logado, registra streak
 * e concede XP na conclusao. Persistido no Supabase (lesson_progress).
 */
export async function setChapterStatus(chapterSlug: string, status: ChapterStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: chapter } = await supabase
    .from("chapters").select("id").eq("slug", chapterSlug).maybeSingle();
  if (!chapter) {
    return {
      error:
        "Chapters are not registered in the database yet. Run supabase/migrations/0004_perfil_e_curso.sql in the Supabase SQL Editor.",
    };
  }

  const { error } = await supabase.from("lesson_progress").upsert({
    user_id: user.id,
    chapter_id: chapter.id,
    status,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  // streak do dia
  await supabase.from("daily_streaks").upsert({
    user_id: user.id,
    day: new Date().toISOString().slice(0, 10),
  });

  // O XP e o nível são calculados no banco a partir do progresso real
  // (trigger sync_xp_level, migration 0022) — não somamos nada aqui,
  // senão marcar/desmarcar a mesma aula inflaria o número.
  if (status === "concluido") {
    await supabase
      .from("profiles")
      .update({ last_study_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleFavorite(chapterSlug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  const { data: chapter } = await supabase
    .from("chapters").select("id").eq("slug", chapterSlug).single();
  if (!chapter) return { error: "chapter not found" };

  const { data: fav } = await supabase.from("favorites")
    .select("chapter_id").eq("user_id", user.id).eq("chapter_id", chapter.id).maybeSingle();

  if (fav) {
    await supabase.from("favorites").delete()
      .eq("user_id", user.id).eq("chapter_id", chapter.id);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, chapter_id: chapter.id });
  }
  revalidatePath(`/course/${chapterSlug}`);
  return { ok: true };
}

/**
 * Registra segundos de leitura de uma aula (chamado pelo cronometro
 * do leitor a cada minuto). Também marca o dia no calendário de
 * estudo e recalcula o streak.
 */
export async function logStudyTime(chapterSlug: string, seconds: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const s = Math.floor(seconds);
  if (!Number.isFinite(s) || s <= 0 || s > 600) return { error: "invalid duration" };

  const { error } = await supabase.rpc("log_study_time", {
    p_chapter_slug: chapterSlug,
    p_seconds: s,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
