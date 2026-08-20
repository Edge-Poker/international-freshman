import type { Metadata, Viewport } from "next";
import "./globals.css";

/*
 * Fontes via stacks de sistema para o repo buildar em qualquer ambiente,
 * sem dependencia de rede. Para usar Archivo/Inter/JetBrains no deploy,
 * troque este arquivo por next/font/google:
 *
 *   import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
 *   const display = Archivo({ subsets:["latin"], weight:["600","800","900"], variable:"--font-display" });
 *   ...e adicione as variaveis no <html className>.
 */

/**
 * Viewport explicito: a pagina acompanha a largura real do aparelho e o
 * usuario continua podendo dar zoom (nunca bloqueamos o pinch, por
 * acessibilidade).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Endereco publico do site, usado para resolver as URLs absolutas de
 * Open Graph (a previa do link no WhatsApp, LinkedIn e afins).
 *
 * Ordem: a variavel explicita ganha; senao usa o dominio que a Vercel
 * injeta sozinha em cada deploy; em ultimo caso, o localhost do dev.
 * Ao registrar um dominio proprio, basta definir NEXT_PUBLIC_SITE_URL.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "How to Be an International Freshman",
    template: "%s | Freshman",
  },
  description:
    "The manual nobody hands you: 13 chapters on the academics, friendships, money and career of your first year studying abroad.",
  openGraph: {
    title: "How to Be an International Freshman",
    description:
      "13 structured chapters on surviving — and then running — your first year abroad.",
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
