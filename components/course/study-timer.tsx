"use client";

import { useEffect, useRef } from "react";
import { logStudyTime } from "@/actions/progress";

/**
 * Cronometro invisivel do leitor: conta 1 segundo por segundo
 * enquanto a aba esta visível, e envia o acumulado pro banco a
 * cada minuto (e ao sair da aula). Não conta com a aba em
 * segundo plano, entao o "tempo estudado" e tempo real de leitura.
 */
export function StudyTimer({ slug }: { slug: string }) {
  const acc = useRef(0);

  useEffect(() => {
    acc.current = 0;

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") acc.current += 1;
    }, 1000);

    function flush() {
      const s = Math.min(acc.current, 600);
      if (s >= 5) {
        acc.current = 0;
        void logStudyTime(slug, s);
      }
    }

    const save = setInterval(flush, 60_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [slug]);

  return null;
}
