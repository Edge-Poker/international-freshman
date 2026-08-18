"use client";

/**
 * Assinatura visual da landing: a CHEGADA.
 *
 * Um arco de voo sai do ponto de origem, atravessa a tela e pousa no
 * campus; no pouso, o mapa do curriculo se acende parte a parte. E a
 * promessa do produto em uma imagem: voce chega perdido, e o plano
 * aparece.
 *
 * Decisoes que valem saber antes de mexer:
 *
 * • O aviao percorre uma bezier quadratica calculada a mao, e nao
 *   `offset-path` do CSS. Motivo: portabilidade. Ja levamos um susto com
 *   o Safari nesta landing; calcular o ponto e o angulo com useTransform
 *   funciona igual em qualquer navegador.
 *
 * • Um unico motion value (`progresso`) governa o ciclo inteiro, e so as
 *   mudancas DISCRETAS (pousou, quantas partes acesas) viram estado do
 *   React. Sem isso seriam ~60 re-renders por segundo.
 *
 * • `prefers-reduced-motion` mostra o quadro final parado — arco inteiro
 *   desenhado, tudo aceso. Nada de movimento.
 *
 * Os dados vem de content/course.ts, entao o mapa acompanha o curriculo.
 */
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { curso } from "@/content/course";

// --- geometria do voo (coordenadas do viewBox) ---
const ORIGEM = { x: 30, y: 122 };
const CONTROLE = { x: 200, y: 6 };
const DESTINO = { x: 366, y: 68 };

const bez = (t: number, a: number, b: number, c: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
const dBez = (t: number, a: number, b: number, c: number) =>
  2 * (1 - t) * (b - a) + 2 * t * (c - b);

const ARCO = `M ${ORIGEM.x} ${ORIGEM.y} Q ${CONTROLE.x} ${CONTROLE.y} ${DESTINO.x} ${DESTINO.y}`;

// --- linha do tempo do ciclo, em fracao de LOOP_MS ---
const LOOP_MS = 8200;
const DECOLA = 0.07;
const POUSA = 0.46;
const ACENDE = POUSA + 0.05; // primeira parte acende logo apos o pouso
const PASSO = 0.062; // intervalo entre partes

export function Arrival() {
  const reduzido = useReducedMotion();
  const decorrido = useRef(0);
  const progresso = useMotionValue(reduzido ? 0.95 : 0);

  const [pousou, setPousou] = useState(Boolean(reduzido));
  const [acesas, setAcesas] = useState(reduzido ? curso.length : 0);
  const refPousou = useRef(Boolean(reduzido));
  const refAcesas = useRef(reduzido ? curso.length : 0);

  useAnimationFrame((_, delta) => {
    if (reduzido) return;
    decorrido.current = (decorrido.current + delta) % LOOP_MS;
    const p = decorrido.current / LOOP_MS;
    progresso.set(p);

    const pousado = p >= POUSA;
    if (pousado !== refPousou.current) {
      refPousou.current = pousado;
      setPousou(pousado);
    }
    const n =
      p < ACENDE ? 0 : Math.min(curso.length, Math.floor((p - ACENDE) / PASSO) + 1);
    if (n !== refAcesas.current) {
      refAcesas.current = n;
      setAcesas(n);
    }
  });

  // trecho do arco ja percorrido (0 a 1)
  const voo = useTransform(progresso, [DECOLA, POUSA], [0, 1], { clamp: true });
  const aviaoX = useTransform(voo, (t) => bez(t, ORIGEM.x, CONTROLE.x, DESTINO.x));
  const aviaoY = useTransform(voo, (t) => bez(t, ORIGEM.y, CONTROLE.y, DESTINO.y));
  const aviaoAng = useTransform(voo, (t) => {
    const dx = dBez(t, ORIGEM.x, CONTROLE.x, DESTINO.x);
    const dy = dBez(t, ORIGEM.y, CONTROLE.y, DESTINO.y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  });
  const aviaoOpac = useTransform(
    progresso,
    [DECOLA - 0.02, DECOLA, POUSA - 0.01, POUSA],
    [0, 1, 1, 0],
    { clamp: true }
  );

  // paralaxe suave pelo cursor (desligada em reduced motion)
  const alvoX = useSpring(0, { stiffness: 110, damping: 18, mass: 0.4 });
  const alvoY = useSpring(0, { stiffness: 110, damping: 18, mass: 0.4 });
  const caixa = useRef<HTMLDivElement>(null);

  function moverCursor(e: React.PointerEvent) {
    if (reduzido || !caixa.current) return;
    const r = caixa.current.getBoundingClientRect();
    alvoX.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    alvoY.set(((e.clientY - r.top) / r.height - 0.5) * 10);
  }
  function sairCursor() {
    alvoX.set(0);
    alvoY.set(0);
  }
  function repetir() {
    if (reduzido) return;
    decorrido.current = 0;
    refPousou.current = false;
    refAcesas.current = 0;
    setPousou(false);
    setAcesas(0);
  }

  const parteAtual = acesas > 0 ? curso[Math.min(acesas, curso.length) - 1] : null;
  const legenda = parteAtual
    ? `${parteAtual.title}: ${parteAtual.subtitle.toLowerCase()} · ${parteAtual.chapters.length} chapters`
    : pousou
      ? "Arrived — here is the plan"
      : "In transit";

  return (
    <div
      ref={caixa}
      onPointerMove={moverCursor}
      onPointerLeave={sairCursor}
      onClick={repetir}
      className="card relative cursor-pointer p-5 shadow-card"
      title={reduzido ? undefined : "Click to replay"}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-dim">
          Arrival
        </span>
        <span className="font-mono text-xs text-dim">
          {pousou ? "on campus" : "en route"}
        </span>
      </div>

      {/* ---------- o voo ---------- */}
      <motion.svg
        viewBox="0 0 400 140"
        className="w-full"
        style={{ x: alvoX, y: alvoY }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="brilhoDestino">
            <stop offset="0%" stopColor="rgb(59,158,255)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(59,158,255)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* arco completo, apagado: o caminho que ainda falta */}
        <path
          d={ARCO}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />

        {/* trecho ja percorrido */}
        <motion.path
          d={ARCO}
          fill="none"
          stroke="rgb(59,158,255)"
          strokeWidth="1.75"
          strokeLinecap="round"
          style={{ pathLength: voo }}
        />

        {/* origem */}
        <circle cx={ORIGEM.x} cy={ORIGEM.y} r="3.5" fill="rgb(59,158,255)" />
        <motion.circle
          cx={ORIGEM.x}
          cy={ORIGEM.y}
          r="3.5"
          fill="none"
          stroke="rgb(59,158,255)"
          animate={reduzido ? undefined : { r: [3.5, 12], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <text
          x={ORIGEM.x - 4}
          y={ORIGEM.y + 17}
          className="fill-current font-mono text-[9px] text-dim"
        >
          home
        </text>

        {/* destino: campus */}
        <circle cx={DESTINO.x} cy={DESTINO.y} r="26" fill="url(#brilhoDestino)" />
        <motion.circle
          cx={DESTINO.x}
          cy={DESTINO.y}
          r="4"
          animate={{ fill: pousou ? "rgb(59,158,255)" : "rgba(255,255,255,0.25)" }}
          transition={{ duration: 0.3 }}
        />
        {pousou && !reduzido && (
          <motion.circle
            cx={DESTINO.x}
            cy={DESTINO.y}
            r="4"
            fill="none"
            stroke="rgb(59,158,255)"
            initial={{ r: 4, opacity: 0.8 }}
            animate={{ r: 22, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
        <text
          x={DESTINO.x - 16}
          y={DESTINO.y - 13}
          className="fill-current font-mono text-[9px] text-dim"
        >
          campus
        </text>

        {/* o aviao */}
        <motion.g style={{ x: aviaoX, y: aviaoY, opacity: aviaoOpac }}>
          <motion.path
            d="M 7 0 L -5 4.5 L -2.5 0 L -5 -4.5 Z"
            fill="rgb(59,158,255)"
            style={{ rotate: aviaoAng }}
          />
        </motion.g>
      </motion.svg>

      {/* ---------- o plano que aparece no pouso ---------- */}
      <div className="mt-2 space-y-2">
        {curso.map((p, i) => {
          const ativa = i < acesas;
          return (
            <div key={p.slug} className="flex items-center gap-2.5">
              <span
                className={`w-7 shrink-0 font-mono text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                  ativa ? "text-accent" : "text-dim/40"
                }`}
              >
                {p.title.replace("Part ", "")}
              </span>
              <div className="flex flex-1 gap-1.5">
                {p.chapters.map((c, ci) => (
                  <motion.div
                    key={c.slug}
                    title={c.title}
                    animate={{
                      backgroundColor: ativa
                        ? "rgba(59,158,255,0.75)"
                        : "rgba(255,255,255,0.05)",
                      boxShadow: ativa
                        ? "0 0 8px rgba(59,158,255,0.35)"
                        : "0 0 0 rgba(0,0,0,0)",
                    }}
                    transition={{ duration: 0.35, delay: ativa ? ci * 0.04 : 0 }}
                    className="h-6 flex-1 rounded-[4px]"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-xs text-dim">{legenda}</p>
    </div>
  );
}
