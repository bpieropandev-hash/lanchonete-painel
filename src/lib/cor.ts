/** Cor padrão da marca quando o admin não escolheu nenhuma. */
export const COR_PADRAO = "#C8321E";

export const CORES_SUGERIDAS = [
  "#C8321E",
  "#C2410C",
  "#B45309",
  "#15803D",
  "#2563EB",
  "#7C3AED",
  "#171717",
];

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function razao(a: number, b: number): number {
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

export function corValida(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Qual texto fica legível sobre a cor (critério WCAG) e se o contraste é
 * suficiente para botões (4,5:1).
 */
export function contraste(hex: string): { texto: "branco" | "preto"; razao: number; ok: boolean } {
  const l = luminancia(hex);
  const comBranco = razao(l, 1);
  const comPreto = razao(l, 0);
  const texto = comBranco >= comPreto ? "branco" : "preto";
  const melhor = Math.max(comBranco, comPreto);
  return { texto, razao: melhor, ok: melhor >= 4.5 };
}
