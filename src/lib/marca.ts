export const NOME_LOJA = process.env.NEXT_PUBLIC_NOME_LOJA || "Lanchonete";

/** Iniciais do nome, ignorando artigos: "Lanchonete da Tia Jú" vira "TJ". */
export function iniciaisLoja(nome = NOME_LOJA): string {
  const palavras = nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
    .filter((p) => !/^(lanchonete|hamburgueria|restaurante|bar)$/i.test(p));
  return (palavras.length ? palavras : nome.split(/\s+/))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Nome curto para o menu: "Lanchonete da Tia Jú" vira "Tia Jú". */
export function nomeCurtoLoja(nome = NOME_LOJA): string {
  return nome.replace(/^(lanchonete|hamburgueria|restaurante|bar)\s+(d[aoe]s?\s+)?/i, "") || nome;
}
