// Lê o endereço do site do cliente em tempo de execução (servidor). Variáveis NEXT_PUBLIC_*
// só entram no código do navegador se existirem durante o build; aqui o valor vem do ambiente
// do servidor a cada requisição, então trocar a variável no Railway vale após reiniciar.
export const dynamic = "force-dynamic";

export function GET() {
  const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  return Response.json({ siteUrl }, { headers: { "Cache-Control": "no-store" } });
}
