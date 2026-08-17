"use client";

import { useEffect, useState } from "react";
import { getUnreadCount } from "@/actions/chat";

/**
 * Bolinha de notificação de mensagens não lidas na sidebar.
 * Comeca com o valor do servidor e se atualiza sozinha a cada
 * 20 segundos enquanto a aba esta visível.
 */
export function UnreadBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        setCount(await getUnreadCount());
      } catch {}
    }, 20_000);
    return () => clearInterval(t);
  }, []);

  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold text-ink-950 shadow-glow-sm"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
