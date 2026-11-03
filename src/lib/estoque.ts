import type {
  FichaApresentacao,
  StatusInsumo,
  TipoMovimento,
  UnidadeInsumo,
} from "@/types/estoque";

/**
 * Lógica pura do módulo de estoque (sem React, sem rede), para ser testada à
 * parte (`estoque.test.cjs`). O servidor é quem calcula saldo e custo de
 * verdade: aqui só se formata, valida o que o usuário digitou e se mostra uma
 * PRÉVIA do que o servidor vai fazer.
 */

/** Mesmos limites do servidor (spec §9): erro de digitação aparece antes do envio. */
export const LIMITES_ESTOQUE = {
  QUANTIDADE: 1_000_000,
  VALOR_TOTAL: 1_000_000,
  CUSTO_UNITARIO: 100_000,
} as const;

export const UNIDADE_ROTULO: Record<UnidadeInsumo, string> = {
  G: "g",
  ML: "ml",
  UN: "un",
};

export const UNIDADE_NOME: Record<UnidadeInsumo, string> = {
  G: "Gramas (g)",
  ML: "Mililitros (ml)",
  UN: "Unidades (un)",
};

export const STATUS_ROTULO: Record<StatusInsumo, string> = {
  OK: "OK",
  BAIXO: "Baixo",
  ZERADO: "Zerado",
  NEGATIVO: "Negativo",
  INATIVO: "Inativo",
};

export const STATUS_CLASSE: Record<StatusInsumo, string> = {
  OK: "bg-green-100 text-green-800",
  BAIXO: "bg-amber-100 text-amber-800",
  ZERADO: "bg-orange-100 text-orange-800",
  NEGATIVO: "bg-red-100 text-red-800",
  INATIVO: "bg-gray-200 text-gray-600",
};

export const TIPO_MOVIMENTO_ROTULO: Record<TipoMovimento, string> = {
  COMPRA: "Compra",
  CONSUMO: "Consumo",
  PERDA: "Perda",
  AJUSTE: "Ajuste",
};

/** Texto → número, tratando vazio e lixo como 0 (só para exibição). */
export function numeroDe(valor: string | number | null | undefined): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** 2400 → "2.400"; 0.5 → "0,5"; até `casasMax` casas, sem zeros à direita. */
export function formatarNumero(
  valor: string | number | null | undefined,
  casasMax = 3,
): string {
  return numeroDe(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasMax,
  });
}

/** "2400.000" + "G" → "2.400 g". */
export function formatarQuantidade(
  valor: string | number | null | undefined,
  unidade: UnidadeInsumo,
): string {
  return `${formatarNumero(valor)} ${UNIDADE_ROTULO[unidade]}`;
}

/** Custo por unidade-base (R$/g...) tem poucos centavos: mostra até 4 casas. */
export function formatarCustoUnitario(
  valor: string | number | null | undefined,
): string {
  return numeroDe(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export interface OpcoesLeitura {
  permitirNegativo?: boolean;
}

/**
 * Lê o que se digita num campo numérico em pt-BR:
 * "1.234,56" → 1234.56 · "0,5" → 0.5 · "1.500" → 1500 (milhar) · "1.5" → 1.5.
 * Devolve null se não for um número.
 */
export function lerDecimal(
  texto: string,
  { permitirNegativo = false }: OpcoesLeitura = {},
): number | null {
  let t = texto.replace(/R\$/gi, "").replace(/\s+/g, "");
  if (t === "") return null;
  let negativo = false;
  if (t.startsWith("-")) {
    if (!permitirNegativo) return null;
    negativo = true;
    t = t.slice(1);
  }
  if (t.includes(",")) {
    // Vírgula é a decimal; pontos são milhar.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    // "1.500" é mil e quinhentos. "0.500" e "1.5" continuam decimais.
    t = t.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

export interface OpcoesCampo {
  rotulo: string;
  casas: number;
  min?: number;
  /** Se true, o valor precisa ser maior que `min` (não igual). */
  minExclusivo?: boolean;
  max: number;
  permitirNegativo?: boolean;
  naoZero?: boolean;
}

export type ResultadoCampo =
  | { ok: true; valor: number }
  | { ok: false; erro: string };

/** Valida um campo numérico digitado, com mensagens em português. */
export function validarDecimal(
  texto: string,
  opcoes: OpcoesCampo,
): ResultadoCampo {
  const { rotulo, casas, max } = opcoes;
  const min = opcoes.min ?? 0;
  const valor = lerDecimal(texto, { permitirNegativo: opcoes.permitirNegativo });
  if (valor === null) {
    return { ok: false, erro: `${rotulo}: informe um número` };
  }
  if (Number(valor.toFixed(casas)) !== valor) {
    return {
      ok: false,
      erro:
        casas === 0
          ? `${rotulo}: use um número inteiro`
          : `${rotulo}: no máximo ${casas} casas decimais`,
    };
  }
  if (opcoes.naoZero && valor === 0) {
    return { ok: false, erro: `${rotulo}: não pode ser zero` };
  }
  if (opcoes.minExclusivo ? valor <= min : valor < min) {
    return {
      ok: false,
      erro: opcoes.minExclusivo
        ? `${rotulo}: precisa ser maior que ${formatarNumero(min)}`
        : `${rotulo}: não pode ser menor que ${formatarNumero(min)}`,
    };
  }
  if (Math.abs(valor) > max) {
    return {
      ok: false,
      erro: `${rotulo}: não pode passar de ${formatarNumero(max)}`,
    };
  }
  return { ok: true, valor };
}

const arredondar = (n: number, casas: number): number => {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Quantidade informada → unidade-base (kg → g multiplica por 1000). */
export function converterParaBase(
  quantidade: number,
  usaUnidadeCompra: boolean,
  fatorCompra: number,
): number {
  return arredondar(usaUnidadeCompra ? quantidade * fatorCompra : quantidade, 3);
}

/** R$ por kg (unidade de compra) → R$ por g (unidade-base), com 6 casas. */
export function custoPorUnidadeBase(
  custoPorUnidadeCompra: number,
  fatorCompra: number,
): number {
  if (!(fatorCompra > 0)) return custoPorUnidadeCompra;
  return arredondar(custoPorUnidadeCompra / fatorCompra, 6);
}

/** R$ por g (unidade-base) → R$ por kg (unidade de compra), com 4 casas. */
export function custoPorUnidadeCompra(
  custoPorUnidadeBase: number,
  fatorCompra: number,
): number {
  return arredondar(custoPorUnidadeBase * fatorCompra, 4);
}

export interface PreviaCompra {
  /** R$ pago por unidade-base. */
  precoPorUnidadeBase: number;
  /** O servidor refaz esta conta no banco; aqui é só uma estimativa para o ADMIN. */
  novoCustoMedio: number;
}

/**
 * Custo médio ponderado (R2): saldo ≤ 0 não pesa no custo.
 * `(base × custoAtual + valorPago) / (base + quantidade)`.
 */
export function previaDaCompra(args: {
  saldo: number;
  custoMedio: number;
  quantidadeBase: number;
  valorTotal: number;
}): PreviaCompra {
  const { saldo, custoMedio, quantidadeBase, valorTotal } = args;
  const base = Math.max(saldo, 0);
  return {
    precoPorUnidadeBase: arredondar(valorTotal / quantidadeBase, 6),
    novoCustoMedio: arredondar(
      (base * custoMedio + valorTotal) / (base + quantidadeBase),
      6,
    ),
  };
}

/** "Dá para fazer 15 (limita: alface)" · "Sem ficha técnica". */
export function textoCapacidade(
  f: Pick<FichaApresentacao, "semFicha" | "capacidade" | "limitante">,
): string {
  if (f.semFicha || f.capacidade === null) return "Sem ficha técnica";
  const base = `Dá para fazer ${formatarNumero(f.capacidade, 0)}`;
  return f.limitante ? `${base} (limita: ${f.limitante.nome})` : base;
}

/** "Custo incompleto: falta comprar Queijo, Alface" ou null se está completo. */
export function textoCustoIncompleto(
  f: Pick<FichaApresentacao, "custoIncompleto" | "insumosSemCusto">,
): string | null {
  if (!f.custoIncompleto || f.insumosSemCusto.length === 0) return null;
  return `Custo incompleto: falta comprar ${f.insumosSemCusto.join(", ")}`;
}

/** Lançamentos que entram (positivo) ou saem (negativo) do estoque. */
export function entradaOuSaida(quantidade: string | number): "entrada" | "saida" | "zero" {
  const n = numeroDe(quantidade);
  if (n > 0) return "entrada";
  if (n < 0) return "saida";
  return "zero";
}

/** "+5.000 g" / "−120 g" / "0 g", com sinal explícito para o extrato. */
export function formatarVariacao(
  quantidade: string | number,
  unidade: UnidadeInsumo,
): string {
  const n = numeroDe(quantidade);
  const sinal = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sinal}${formatarNumero(Math.abs(n))} ${UNIDADE_ROTULO[unidade]}`;
}

/** O menu "Estoque" só existe com o módulo habilitado (decisão do dono). */
export function menuEstoqueVisivel(
  perfil: string | undefined,
  config: { habilitado: boolean } | null,
): boolean {
  return (perfil === "ADMIN" || perfil === "ATENDENTE") && !!config?.habilitado;
}

/** Só o ADMIN vê custos (decisão 4 da spec). */
export function podeVerCustos(perfil: string | undefined): boolean {
  return perfil === "ADMIN";
}
