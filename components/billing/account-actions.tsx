"use client";

/**
 * Ações de conta da página de planos que não pertencem a um card:
 * cancelar a assinatura e descer para o Free. Renderizadas uma única
 * vez abaixo da grade. Falam só com as server actions; o placeholder
 * desta etapa responde not_implemented e a mensagem aparece aqui.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelSubscriptionAction, downgradePlanAction } from "@/actions/billing";
import type { CheckoutResponse, PlanCta } from "@/types/billing";

export function AccountActions({ actions }: { actions: PlanCta[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (actions.length === 0) return null;

  function run(cta: PlanCta) {
    if (!cta.intent) return;
    setMessage(null);
    startTransition(async () => {
      let res: CheckoutResponse;
      if (cta.intent === "cancel") res = await cancelSubscriptionAction("free");
      else res = await downgradePlanAction("free");
      if (res.status === "redirect") window.location.assign(res.url);
      else if (res.status === "auth_required") router.push(res.redirectTo);
      else setMessage(res.message);
    });
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        {actions.map((a) => (
          <Button key={a.label} variant="ghost" disabled={pending} onClick={() => run(a)}>
            {a.label}
          </Button>
        ))}
      </div>
      {message && (
        <p className="max-w-md text-center font-mono text-[11px] leading-relaxed text-gold">
          {message}
        </p>
      )}
    </div>
  );
}
