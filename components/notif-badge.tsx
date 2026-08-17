"use client";

import { useEffect, useState } from "react";
import { getUnreadNotifCount } from "@/actions/notifications";

/** Bolinha de notificações não lidas na sidebar, com atualização automática. */
export function NotifBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try { setCount(await getUnreadNotifCount()); } catch {}
    }, 20_000);
    return () => clearInterval(t);
  }, []);

  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread notifications`}
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 font-mono text-[10px] font-bold text-ink-950"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
