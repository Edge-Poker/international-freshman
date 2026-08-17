"use client";

/**
 * Preferencias do leitor: tema claro/escuro, tamanho da fonte e largura
 * da coluna. Persistidas em localStorage e aplicadas via CSS variables.
 */
import { useEffect, useState } from "react";
import { Sun, Moon, AArrowDown, AArrowUp } from "lucide-react";

const SIZES = ["0.9375rem", "1.0625rem", "1.1875rem", "1.3125rem"];
const WIDTHS = ["38rem", "44rem", "52rem"];

export function ReaderControls() {
  const [light, setLight] = useState(false);
  const [size, setSize] = useState(1);
  const [width, setWidth] = useState(1);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("reader-prefs") ?? "{}");
      if (saved.light) setLight(true);
      if (saved.size != null) setSize(saved.size);
      if (saved.width != null) setWidth(saved.width);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reader-light", light);
    document.documentElement.style.setProperty("--reader-size", SIZES[size]);
    document.documentElement.style.setProperty("--reader-width", WIDTHS[width]);
    localStorage.setItem("reader-prefs", JSON.stringify({ light, size, width }));
  }, [light, size, width]);

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-dim transition-colors hover:border-accent/50 hover:text-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button aria-label="Decrease font size" className={btn}
        onClick={() => setSize((s) => Math.max(0, s - 1))}>
        <AArrowDown className="h-4 w-4" />
      </button>
      <button aria-label="Increase font size" className={btn}
        onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}>
        <AArrowUp className="h-4 w-4" />
      </button>
      <button aria-label="Toggle column width" className={`${btn} w-auto px-3 font-mono text-xs`}
        onClick={() => setWidth((w) => (w + 1) % WIDTHS.length)}>
        width
      </button>
      <button aria-label="Toggle theme" className={btn} onClick={() => setLight((l) => !l)}>
        {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </div>
  );
}
