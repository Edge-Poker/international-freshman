"use client";

/**
 * Ações de gestão da assinatura na página "Minha assinatura":
 * cancelar e renovar. Falam apenas com as server actions; o placeholder
 * desta etapa responde not_implemented e a mensagem aparece aqui.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  cancelSubscriptionAction,
  renewSubscriptionAction,
} from "@/actions/billing";

export function SubscriptionActions({
  planSlug,
  canRenew,
}: {
  planSlug: string;
  canRenew: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(kind: "cancel" | "renew") {
    setMessage(null);
    startTransition(async () => {
      const res =
        kind === "cancel"
          ? await cancelSubscriptionAction(planSlug)
          : await renewSubscriptionAction(planSlug);
      if (res.status === "redirect") window.location.assign(res.url);
      else if (res.status === "auth_required") window.location.assign(res.redirectTo);
      else setMessage(res.message);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {canRenew && (
          <Button variant="primary" disabled={pending} onClick={() => run("renew")}>
            Renovar agora
          </Button>
        )}
        <Button variant="ghost" disabled={pending} onClick={() => run("cancel")}>
          Cancelar assinatura
        </Button>
      </div>
      {message && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-gold">{message}</p>
      )}
    </div>
  );
}
