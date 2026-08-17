"use client";

/**
 * Botão de ação de um card de plano. Fala EXCLUSIVAMENTE com as server
 * actions de billing (nunca com gateway). Trata as quatro respostas do
 * contrato CheckoutResponse:
 *   redirect        → navega (comportamento da integração futura);
 *   auth_required   → manda o visitante para o cadastro com retorno;
 *   not_implemented → mostra a mensagem do placeholder desta etapa;
 *   error           → mostra a mensagem de erro.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  changePlanAction,
  downgradePlanAction,
  renewSubscriptionAction,
  startCheckoutAction,
} from "@/actions/billing";
import type { CheckoutIntent, CheckoutResponse } from "@/types/billing";

export function PlanCta({
  planSlug,
  intent,
  label,
  disabled,
  highlighted,
  note,
}: {
  planSlug: string;
  intent: CheckoutIntent | null;
  label: string;
  disabled: boolean;
  highlighted: boolean;
  note?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    if (!intent || disabled) return;
    setMessage(null);
    startTransition(async () => {
      let res: CheckoutResponse;
      if (intent === "change_plan") res = await changePlanAction(planSlug);
      else if (intent === "downgrade") res = await downgradePlanAction(planSlug);
      else if (intent === "renew") res = await renewSubscriptionAction(planSlug);
      else res = await startCheckoutAction(planSlug);

      if (res.status === "redirect") {
        window.location.assign(res.url);
      } else if (res.status === "auth_required") {
        router.push(res.redirectTo);
      } else {
        setMessage(res.message);
      }
    });
  }

  return (
    <div>
      <Button
        variant={disabled ? "ghost" : highlighted ? "primary" : "ghost"}
        className="w-full"
        disabled={disabled || pending}
        onClick={run}
      >
        {pending ? "Abrindo..." : label}
      </Button>
      {note && !message && (
        <p className="mt-2 text-center font-mono text-[11px] text-gold">{note}</p>
      )}
      {message && (
        <p className="mt-2 text-center font-mono text-[11px] leading-relaxed text-gold">
          {message}
        </p>
      )}
    </div>
  );
}
