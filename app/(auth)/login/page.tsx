import { AuthForm } from "@/components/auth-form";
import { TriangleAlert, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmacao?: string }>;
}) {
  const { confirmacao } = await searchParams;

  // conta confirmada com sucesso, faltando apenas entrar
  const sucesso = confirmacao === "confirmada";

  return (
    <>
      {confirmacao && (
        <div
          className={`card mb-4 flex items-start gap-3 p-4 ${
            sucesso ? "border-accent/40 bg-accent/10" : "border-gold/40 bg-gold/10"
          }`}
        >
          {sucesso ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          )}
          <p className={`text-sm ${sucesso ? "text-accent" : "text-gold"}`}>
            {sucesso
              ? "Your account is confirmed. Log in with your email and password to get started."
              : confirmacao === "expirada"
                ? "That confirmation link is no longer valid. Try logging in below: if the account is still unconfirmed, we will send a new link."
                : "We could not read that link. Try logging in below to get a new one if needed."}
          </p>
        </div>
      )}
      <AuthForm mode="login" />
    </>
  );
}
