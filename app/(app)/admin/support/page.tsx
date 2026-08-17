import Link from "next/link";
import { listSupport, type SupportFilter } from "@/lib/admin";
import { SupportAnswerButton } from "@/components/admin/support-actions";
import { Avatar } from "@/components/profile/avatar";
import { PlanBadge } from "@/components/admin/ui";
import { LifeBuoy, Mail } from "lucide-react";

export const metadata = { title: "Admin · Support" };

const FILTROS: { value: SupportFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "abertas", label: "Abertas" },
  { value: "respondidas", label: "Respondidas" },
];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtro = (FILTROS.find((f) => f.value === status)?.value ?? "todas") as SupportFilter;
  const { rows, total } = await listSupport(filtro);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dim">
          Messages sent through the platform Support page.
        </p>
        <span className="font-mono text-xs text-dim">{total} no total</span>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/support?status=${f.value}`}
            className={`rounded-xl border px-4 py-2 font-mono text-xs transition-colors ${
              filtro === f.value
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-white/10 text-dim hover:border-accent/40 hover:text-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <ul className="mt-6 space-y-3">
        {rows.map((m) => (
          <li key={m.id} className={`card p-5 ${m.answered ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar url={m.user_avatar_url} name={m.user_nickname ?? m.user_name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {m.user_nickname ? `@${m.user_nickname}` : (m.user_name ?? "conta removida")}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-dim">
                    <PlanBadge plan={m.user_plan} />
                    {m.user_email && (
                      <a href={`mailto:${m.user_email}`} className="inline-flex items-center gap-1 break-all hover:text-accent">
                        <Mail className="h-3 w-3" /> {m.user_email}
                      </a>
                    )}
                  </p>
                </div>
              </div>
              <SupportAnswerButton id={m.id} answered={m.answered} />
            </div>

            <p className="mt-4 font-semibold text-accent">{m.subject ?? "No subject"}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-dim">{m.body}</p>
            <p className="mt-3 font-mono text-[10px] text-dim">
              {new Date(m.created_at).toLocaleString("pt-BR")}
              {m.answered && m.answered_at &&
                ` · respondida em ${new Date(m.answered_at).toLocaleString("pt-BR")}`}
            </p>
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <LifeBuoy className="mx-auto h-8 w-8 text-dim" />
          <p className="mt-3 font-semibold">No messages here</p>
          <p className="mt-2 text-sm text-dim">
            Messages sent through the Support page appear in this list.
          </p>
        </div>
      )}
    </div>
  );
}
