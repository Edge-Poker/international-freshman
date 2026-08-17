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

// TODO: apontar para o dominio real assim que ele estiver registrado.
export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
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
