"use client";

import { useState } from "react";
import { LockedModal } from "@/components/course/locked-modal";

/**
 * Envolve qualquer conteúdo que, para o usuário Free, deve ficar
 * VISÍVEL mas não acessível. O card continua aparecendo igual; ao
 * clicar, em vez de navegar, abre o modal Premium.
 *
 * Usado no índice do curso e no dashboard: a estrutura (partes,
 * capítulos, provas) permanece à mostra como demonstração da
 * plataforma, mas nada abre.
 */
export function LockedContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block w-full cursor-pointer text-left ${className ?? ""}`}
        aria-haspopup="dialog"
      >
        {children}
      </button>
      <LockedModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
      />
    </>
  );
}
