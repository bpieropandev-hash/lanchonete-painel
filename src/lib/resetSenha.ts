import { NOME_LOJA } from "@/lib/marca";

/** Endereço do site do cliente, lido do servidor (/api/config). Vazio = não configurado. */
export async function buscarSiteUrl(): Promise<string> {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as { siteUrl?: string };
    return typeof data.siteUrl === "string" ? data.siteUrl : "";
  } catch {
    return "";
  }
}

/** Link da página de redefinição no site. O token vai no fragmento: não chega a logs nem ao Referer. */
export function linkRedefinirSenha(siteUrl: string, token: string): string {
  return `${siteUrl}/redefinir-senha#token=${encodeURIComponent(token)}`;
}

export function mensagemRedefinirSenha(nome: string, link: string, expiraEm: string): string {
  const hora = new Date(expiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    `Olá ${nome}! Aqui é da ${NOME_LOJA}. Para criar uma nova senha, abra o link abaixo ` +
    `(vale até ${hora}, uso único):\n${link}`
  );
}
