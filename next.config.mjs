/** @type {import('next').NextConfig} */

/**
 * Cabeçalhos de segurança (item 3.4 do relatório de pentest).
 *
 * Notas de projeto:
 * • frame-ancestors / X-Frame-Options bloqueiam clickjacking: impedem que
 *   o EDGE seja embutido num iframe de outro site para enganar o usuário.
 * • O CSP permite 'unsafe-inline' em script-src porque o Next.js injeta
 *   scripts inline na hidratação. Um CSP com nonce seria mais rígido, mas
 *   exigiria reescrever o middleware e quebra com facilidade. Mesmo assim,
 *   este CSP já barra scripts vindos de domínios externos, que é o vetor
 *   real de injeção de terceiros.
 * • connect-src libera o Supabase (banco, auth, storage e realtime).
 */
const CSP = [
  "default-src 'self'",
  // challenges.cloudflare.com: script e iframe do CAPTCHA (Turnstile)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
