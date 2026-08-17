import { curso } from "../content/course";

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [];
lines.push("-- ============================================================");
lines.push("-- INTERNATIONAL FRESHMAN — perfil + seed do curso (migration 0004)");
lines.push("-- Adiciona chapters_done ao profile e popula parts/chapters,");
lines.push("-- para que o progresso e a % do curso funcionem.");
lines.push("-- GERADO por scripts/gen-seed.ts a partir de content/course.ts.");
lines.push("-- Nao edite a mao: rode `npx tsx scripts/gen-seed.ts > supabase/migrations/0004_perfil_e_curso.sql`.");
lines.push("-- Rode DEPOIS de 0001, 0002 e 0003.");
lines.push("-- ============================================================");
lines.push("");
lines.push("alter table public.profiles add column if not exists chapters_done integer not null default 0;");
lines.push("");

let pp = 0;
for (const p of curso) {
  pp++;
  lines.push(
    `insert into public.parts (slug, title, subtitle, position) values ('${esc(p.slug)}', '${esc(p.title)}', '${esc(p.subtitle)}', ${pp})`
  );
  lines.push(
    `  on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;`
  );
}
lines.push("");

for (const p of curso) {
  let cp = 0;
  for (const c of p.chapters) {
    cp++;
    const free = c.isFree ? "true" : "false";
    lines.push(
      `insert into public.chapters (part_id, slug, title, summary, est_minutes, position, is_free) values ` +
        `((select id from public.parts where slug = '${esc(p.slug)}'), '${esc(c.slug)}', '${esc(c.title)}', '${esc(c.summary)}', ${c.estMinutes}, ${cp}, ${free})`
    );
    lines.push(
      `  on conflict (slug) do update set title = excluded.title, summary = excluded.summary, est_minutes = excluded.est_minutes, position = excluded.position, is_free = excluded.is_free, part_id = excluded.part_id;`
    );
  }
}
lines.push("");
console.log(lines.join("\n"));
