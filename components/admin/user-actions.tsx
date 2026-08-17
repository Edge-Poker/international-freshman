"use client";

import { useState, useTransition } from "react";
import {
  activateUserSubscription,
  cancelUserSubscription,
  changeUserPlan,
  deleteUserAccount,
  expireUserSubscription,
  grantLifetime,
  renewUserSubscription,
  resetUserProgress,
} from "@/actions/admin-panel";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { BanButton } from "@/components/profile/ban-button";
import { SilenceButton } from "@/components/profile/silence-button";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck, CalendarClock, CircleSlash, Crown, Eraser,
  RefreshCcw, Trash2, XCircle,
} from "lucide-react";

const PLANOS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Monthly" },
  { value: "vitalicio", label: "Lifetime" },
] as const;

/**
 * Painel de ações do usuário. Cada ação:
 *  • exige confirmação (duplo clique, padrão da plataforma);
 *  • roda em server action que revalida admin no servidor;
 *  • cai numa RPC `security definer` que revalida no banco.
 * Banir e silenciar reutilizam os botões já existentes do perfil.
 */
export function UserActions({
  userId,
  currentPlan,
  isBanned,
  isSilenced,
  isAdmin,
}: {
  userId: string;
  currentPlan: string;
  isBanned: boolean;
  isSilenced: boolean;
  isAdmin: boolean;
}) {
  const [plano, setPlano] = useState(currentPlan);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planOk, setPlanOk] = useState(false);
  const [pending, start] = useTransition();

  function aplicarPlano() {
    setPlanError(null);
    setPlanOk(false);
    start(async () => {
      const res = await changeUserPlan(userId, plano);
      if (res && "error" in res && res.error) setPlanError(res.error);
      else setPlanOk(true);
    });
  }

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="font-display text-lg font-black">Admin actions</h2>
      <p className="mt-1 text-sm text-dim">
        Every action asks for confirmation and is validated on the server and in the database.
      </p>

      {/* plano */}
      <div className="mt-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Change plan</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={plano}
            onChange={(e) => { setPlano(e.target.value); setPlanOk(false); }}
            aria-label="User plan"
            className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {PLANOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="primary"
            disabled={pending || plano === currentPlan}
            onClick={aplicarPlano}
          >
            <BadgeCheck className="h-4 w-4" />
            {pending ? "Aplicando..." : "Apply plan"}
          </Button>
        </div>
        {planError && <p className="mt-2 text-xs text-danger">{planError}</p>}
        {planOk && <p className="mt-2 font-mono text-xs text-accent">Plan updated.</p>}
        <p className="mt-2 text-xs text-dim">
          Manual grant: Monthly opens a 30-day period; Lifetime never expires;
          Free encerra o acesso atual.
        </p>
      </div>

      {/* assinatura */}
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">Subscription</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ConfirmActionButton
          label="Activate subscription"
          icon={<BadgeCheck className="h-4 w-4 text-accent" />}
          action={() => activateUserSubscription(userId)}
        />
        <ConfirmActionButton
          label="Renew subscription"
          icon={<RefreshCcw className="h-4 w-4 text-accent" />}
          action={() => renewUserSubscription(userId)}
        />
        <ConfirmActionButton
          label="Cancel (at period end)"
          icon={<XCircle className="h-4 w-4 text-gold" />}
          action={() => cancelUserSubscription(userId, false)}
        />
        <ConfirmActionButton
          label="Expire subscription now"
          icon={<CalendarClock className="h-4 w-4 text-danger" />}
          action={() => expireUserSubscription(userId)}
        />
        <ConfirmActionButton
          label="Convert to Lifetime"
          icon={<Crown className="h-4 w-4 text-gold" />}
          action={() => grantLifetime(userId)}
          className="sm:col-span-2"
        />
      </div>

      {/* moderação — reutiliza os botões existentes do perfil */}
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-accent">Moderation</p>
      {isAdmin ? (
        <p className="mt-2 text-sm text-dim">
          Administrator accounts cannot be banned, silenced or deleted.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <BanButton userId={userId} isBanned={isBanned} />
          <SilenceButton userId={userId} isSilenced={isSilenced} />
        </div>
      )}

      {/* zona perigosa */}
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-danger">Danger zone</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ConfirmActionButton
          label="Reset course progress"
          confirmLabel="Confirm progress reset"
          icon={<Eraser className="h-4 w-4" />}
          action={() => resetUserProgress(userId)}
        />
        {!isAdmin && (
          <ConfirmActionButton
            label="Delete account"
            confirmLabel="Confirm permanent deletion"
            pendingLabel="Excluindo..."
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            action={() => deleteUserAccount(userId)}
          />
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-dim">
        <CircleSlash className="h-3.5 w-3.5" />
        Deleting an account removes the user and all their content, permanently.
      </p>
    </div>
  );
}
