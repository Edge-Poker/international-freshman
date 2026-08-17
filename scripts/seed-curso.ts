/**
 * Popula as tabelas parts e chapters a partir de content/course.ts.
 * Uso: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente e rode
 *   npx tsx scripts/seed-curso.ts
 * Idempotente: usa upsert por slug.
 */
import { createClient } from "@supabase/supabase-js";
import { curso } from "../content/course";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  let partPos = 0;
  for (const parte of curso) {
    partPos++;
    const { data: part, error: pe } = await db
      .from("parts")
      .upsert(
        { slug: parte.slug, title: parte.title, subtitle: parte.subtitle, position: partPos },
        { onConflict: "slug" }
      )
      .select("id")
      .single();
    if (pe) throw pe;

    let chPos = 0;
    for (const c of parte.chapters) {
      chPos++;
      const { error: ce } = await db.from("chapters").upsert(
        {
          part_id: part!.id,
          slug: c.slug,
          title: c.title,
          summary: c.summary,
          // body_md removido de propósito: o conteúdo vive em
          // content/course.ts e nunca é gravado no banco (migration 0023)
          est_minutes: c.estMinutes,
          position: chPos,
          is_free: c.isFree ?? false,
        },
        { onConflict: "slug" }
      );
      if (ce) throw ce;
    }
    console.log(`✓ ${parte.title} — ${parte.chapters.length} capitulos`);
  }
  console.log("Seed do curso concluido.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
