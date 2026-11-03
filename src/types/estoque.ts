/**
 * Formas das respostas de `/admin/estoque/*` (API: docs/specs/estoque-e-gestao.md).
 * Quantidades e valores chegam como TEXTO decimal exato do Postgres ("2400.000");
 * só viram `number` para exibir ou comparar.
 */

export type UnidadeInsumo = "G" | "ML" | "UN";

export type StatusInsumo = "NEGATIVO" | "ZERADO" | "BAIXO" | "OK" | "INATIVO";

export type TipoMovimento = "COMPRA" | "CONSUMO" | "PERDA" | "AJUSTE";

/** Estado do módulo: `habilitado` é a escolha do dono; `ativo` é a baixa automática. */
export interface ConfigEstoque {
  habilitado: boolean;
  ativo: boolean;
  inicioEm: string | null;
  atualizadoEm: string;
}

export interface Insumo {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  saldo: string;
  estoqueMinimo: string;
  porcaoAdicional: string | null;
  ingredienteId: string | null;
  unidadeCompra: string | null;
  fatorCompra: string;
  ativo: boolean;
  status: StatusInsumo;
  criadoEm: string;
  atualizadoEm: string;
  /** Só o ADMIN recebe: para os demais perfis a chave nem existe. */
  custoMedio?: string;
}

export interface MovimentoEstoque {
  id: string;
  insumoId: string;
  insumoNome?: string;
  tipo: TipoMovimento;
  quantidade: string;
  saldoApos: string;
  pedidoId: string | null;
  itemPedidoId: string | null;
  usuarioId: string | null;
  fornecedor: string | null;
  motivo: string | null;
  criadoEm: string;
  /** Só o ADMIN recebe. */
  custoUnitario?: string;
  valorTotal?: string;
}

export interface MovimentosPaginados {
  data: MovimentoEstoque[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface ResultadoLancamento {
  insumo: Insumo;
  movimento: MovimentoEstoque;
}

export interface ItemFicha {
  insumoId: string;
  insumoNome: string;
  unidade: UnidadeInsumo;
  quantidade: string;
}

export interface ItemFichaCalculado extends ItemFicha {
  saldo: string;
  custoMedio: string;
  custoLinha: string;
  capacidade: number;
}

/** Um lanche como o cliente o pede: o produto, ou uma de suas variantes. */
export interface FichaApresentacao {
  produtoId: string;
  varianteId: string | null;
  produtoNome: string;
  varianteNome: string | null;
  nome: string;
  preco: string;
  semFicha: boolean;
  origemFicha: "VARIANTE" | "BASE" | null;
  itens: ItemFichaCalculado[];
  custo: string | null;
  margem: string | null;
  cmvPercentual: string | null;
  capacidade: number | null;
  limitante: { insumoId: string; nome: string } | null;
  custoIncompleto: boolean;
  insumosSemCusto: string[];
}

export interface FichaProduto {
  produto: { id: string; nome: string; precoBase: string };
  base: ItemFicha[];
  variantes: Array<{
    id: string;
    nome: string;
    preco: string;
    itens: ItemFicha[];
  }>;
}

export interface InsumoEmFalta {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  saldo: string;
  estoqueMinimo: string;
  status: StatusInsumo;
}

export interface ResumoEstoque {
  valorEmEstoque: string;
  insumos: {
    ativos: number;
    ok: number;
    baixo: number;
    zerado: number;
    negativo: number;
    inativos: number;
    aRepor: number;
  };
  faltando: InsumoEmFalta[];
  mes: { de: string; ate: string; compras: string; cmv: string; perdas: string };
  lanches: {
    total: number;
    semFicha: number;
    semEstoque: number;
    custoIncompleto: number;
  };
  pedidosSemBaixa: number;
}

export interface FalhaPendente {
  pedidoId: string;
  numero: number;
  status: string;
  erro: string;
  criadoEm: string;
}

export interface ResultadoReprocessamento {
  semBaixa: string | null;
  registrados: number;
  jaRegistrados: number;
  itensSemFicha: number;
}
