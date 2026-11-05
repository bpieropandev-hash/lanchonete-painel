/** Helpers puros para exibir e validar a prévia do caixa. A API calcula os totais. */

export function lerValorCaixa(
  texto: string | undefined,
  maximo: number,
): number | null {
  if (!texto) return null;
  const valor = texto.trim();
  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(valor))
    return null;
  const partes = valor.split(",");
  const reais = Number(partes[0].replace(/\./g, ""));
  const centavos = partes[1] ? Number(partes[1].padEnd(2, "0")) : 0;
  const totalCentavos = reais * 100 + centavos;
  return Number.isSafeInteger(totalCentavos) && totalCentavos <= maximo * 100
    ? totalCentavos / 100
    : null;
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() + 1 === mes &&
    data.getUTCDate() === dia
  );
}

export function periodoValido(inicio: string, fim: string): boolean {
  if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) return false;
  const dias =
    (Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) /
    86_400_000;
  return dias <= 366;
}

export function distribuicaoPagamentos(totais: {
  totalGeral: number;
  totalPix: number;
  totalDinheiro: number;
  totalCartao: number;
}): [number, number, number] {
  const total = totais.totalGeral;
  if (!Number.isFinite(total) || total <= 0) return [0, 0, 0];
  return [totais.totalPix, totais.totalDinheiro, totais.totalCartao].map(
    (valor) => Math.max(0, Math.min(100, Math.round((valor / total) * 100))),
  ) as [number, number, number];
}
