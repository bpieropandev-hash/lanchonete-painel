/** Origem (esquema + host) de uma URL de ambiente; vazio se inválida. */
function origem(valor) {
  try {
    return new URL(valor).origin;
  } catch {
    return "";
  }
}

const emDev = process.env.NODE_ENV !== "production";
const api = origem(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000");
const ws = origem(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000");
const wsSeguro = ws.replace(/^http/, "ws");

// CSP sem nonce (o Next 14 injeta scripts inline): bloqueia frames, plugins,
// sequestro de <base>/formulários e conexões para origens desconhecidas.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${[api, ws, wsSeguro].filter(Boolean).join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um servidor enxuto em .next/standalone (usado pelo Dockerfile)
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
