"use client";

/**
 * Assinatura visual da marca: o curriculo inteiro como um mapa.
 * Cada linha e uma parte do curso, cada quadrado um capitulo; a animacao
 * cicla parte a parte, acendendo os capitulos daquela etapa e acumulando
 * as anteriores — a leitura e "voce avanca e o mapa se preenche".
 *
 * Ocupa o lugar da matriz 13x13 de ranges do projeto de origem.
 * Os dados vem de content/course.ts, entao o visual acompanha qualquer
 * mudanca no curriculo sem edicao aqui.
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { curso } from "@/content/course";

export function CurriculumGrid() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % curso.length), 2400);
    return () => clearInterval(t);
  }, []);

  const parte = curso[active];

  return (
    <div className="card relative p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-dim">
          The curriculum
        </span>
        <div className="flex gap-1.5">
          {curso.map((p, i) => (
            <span
              key={p.slug}
              className={`rounded-md px-2 py-0.5 font-mono text-xs transition-colors ${
                i === active ? "bg-accent text-ink-950" : "bg-white/5 text-dim"
              }`}
            >
              {p.title.replace("Part ", "")}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {curso.map((p, pi) => (
          <div key={p.slug} className="flex items-center gap-2.5">
            <span
              className={`w-8 shrink-0 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                pi === active ? "text-accent" : "text-dim"
              }`}
            >
              {p.title.replace("Part ", "")}
            </span>
            <div className="flex flex-1 gap-1.5">
              {p.chapters.map((c, ci) => {
                const on = pi <= active;
                return (
                  <motion.div
                    key={c.slug}
                    title={c.title}
                    animate={{
                      backgroundColor: on
                        ? pi === active
                          ? "rgba(59,158,255,0.85)"
                          : "rgba(59,158,255,0.28)"
                        : "rgba(255,255,255,0.05)",
                      boxShadow:
                        pi === active ? "0 0 10px rgba(59,158,255,0.45)" : "none",
                    }}
                    transition={{ duration: 0.45, delay: ci * 0.05 }}
                    className="h-7 flex-1 rounded-[4px]"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-xs text-dim">
        {parte.title}: {parte.subtitle.toLowerCase()} · {parte.chapters.length}{" "}
        {parte.chapters.length === 1 ? "chapter" : "chapters"}
      </p>
    </div>
  );
}
