import { NOME_LOJA } from "@/lib/marca";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

/** Link da página de redefinição no site. O token vai no fragmento: não chega a logs nem ao Referer. */
export function linkRedefinirSenha(token: string): string {
  return `${SITE_URL}/redefinir-senha#token=${encodeURIComponent(token)}`;
}

export function mensagemRedefinirSenha(nome: string, link: string, expiraEm: string): string {
  const hora = new Date(expiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    `Olá ${nome}! Aqui é da ${NOME_LOJA}. Para criar uma nova senha, abra o link abaixo ` +
    `(vale até ${hora}, uso único):\n${link}`
  );
}

/** Sem NEXT_PUBLIC_SITE_URL o link sairia relativo e não funcionaria no celular do cliente. */
export const siteUrlConfigurada = SITE_URL !== "";
