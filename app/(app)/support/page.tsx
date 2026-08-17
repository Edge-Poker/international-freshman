import { createClient } from "@/lib/supabase/server";
import { SupportForm } from "@/components/support-form";
import { SUPPORT_EMAIL } from "@/lib/support";
import { LifeBuoy, Mail, Clock3 } from "lucide-react";

export const metadata = { title: "Support" };

/**
 * Canal oficial de atendimento. O formulario grava a mensagem vinculada
 * a conta (o atendimento ja recebe nickname, plano e e-mail juntos) e o
 * e-mail fica visivel como alternativa direta.
 */
export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: minhas } = await supabase
    .from("support_messages")
    .select("id, subject, body, answered, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const historico = minhas ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <LifeBuoy className="h-5 w-5 text-accent" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Support</h1>
          <p className="mt-0.5 text-sm text-dim">
            Problems, questions or suggestions — talk to us.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <SupportForm />
      </div>

      {/* alternativa por e-mail */}
      <div className="card mt-4 flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10">
          <Mail className="h-5 w-5 text-dim" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Prefer email?</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="break-all font-mono text-xs text-accent hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      {/* historico do proprio usuario */}
      {historico.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-black">Your messages</h2>
          <ul className="mt-3 space-y-2">
            {historico.map((m) => (
              <li key={m.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{m.subject ?? "Message"}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      m.answered
                        ? "bg-accent/15 text-accent"
                        : "bg-white/5 text-dim"
                    }`}
                  >
                    {m.answered ? "answered" : "waiting"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-dim">{m.body}</p>
                <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-dim">
                  <Clock3 className="h-3 w-3" />
                  {new Date(m.created_at).toLocaleString("en-US")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
