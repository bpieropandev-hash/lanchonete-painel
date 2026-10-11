export type PerfilUsuario = "ADMIN" | "ATENDENTE" | "CHAPEIRO" | "ENTREGADOR";

export type StatusPedido =
  | "NOVO"
  | "PREPARANDO"
  | "PRONTO"
  | "SAIU_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO";

export type TipoPagamento = "PIX" | "DINHEIRO" | "CARTAO";

export type TipoEntrega = "ENTREGA" | "RETIRADA";

export type ModoFuncionamento = "AUTO" | "ABERTA" | "FECHADA";

export interface FaixaHorario {
  /** 0 = domingo ... 6 = sábado */
  dia: number;
  abre: string;
  fecha: string;
}

export interface BairroEntrega {
  id: string;
  nome: string;
  taxa: number | string;
  ativo?: boolean;
}

export interface ConfiguracaoLoja {
  aberta: boolean;
  modoFuncionamento: ModoFuncionamento;
  mensagemFechada: string | null;
  proximaAbertura: string | null;
  horarios: FaixaHorario[];
  pedidoMinimo: number;
  taxaEntregaPadrao: number;
  entregaApenasBairrosCadastrados: boolean;
  aceitaEntrega: boolean;
  aceitaRetirada: boolean;
  tempoEstimadoEntregaMin: number;
  tempoEstimadoRetiradaMin: number;
  bairros: BairroEntrega[];
}

export type TipoCategoria = "LANCHE" | "BEBIDA" | "OUTRO";

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  usuario: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    perfil?: PerfilUsuario;
  };
}

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  tipo: TipoCategoria;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Ingrediente {
  id: string;
  nome: string;
  precoAdicional: string;
  removivel: boolean;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface VarianteProduto {
  id: string;
  produtoId?: string;
  nome: string;
  preco: string;
  disponivel: boolean;
  ordem: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  precoBase: string;
  fotoUrl: string | null;
  disponivel: boolean;
  ordem: number;
  categoriaId: string;
  categoria?: Categoria;
  /** padrao = vem no lanche (cliente pode remover); !padrao = extra pago */
  produtoIngredientes?: {
    id: string;
    ingredienteId: string;
    padrao: boolean;
    ingrediente?: Ingrediente;
  }[];
  variantes?: VarianteProduto[];
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
}

export interface EnderecoSnapshot {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
}

export interface ItemPedidoPersonalizacoes {
  removidos: string[];
  adicionados: { ingredienteId?: string; nome: string; preco: string | number }[];
  observacao?: string | null;
}

export interface ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  nomeProdutoSnapshot: string;
  varianteId: string | null;
  nomeVarianteSnapshot: string | null;
  precoUnitario: string;
  quantidade: number;
  subtotal: string;
  personalizacoes: ItemPedidoPersonalizacoes | null;
  produto?: Produto;
}

export interface Pedido {
  id: string;
  numero: number;
  clienteId: string | null;
  cliente?: Cliente | null;
  status: StatusPedido;
  tipoEntrega: TipoEntrega;
  pagamento: TipoPagamento;
  trocoPara: string | null;
  subtotal: string;
  taxaEntrega: string;
  total: string;
  obs: string | null;
  enderecoEntregaSnapshot: EnderecoSnapshot | null;
  motivoCancelamento: string | null;
  entregadorId: string | null;
  entregador?: Entregador | null;
  itens: ItemPedido[];
  criadoEm: string;
  atualizadoEm: string;
  whatsappLink?: string;
}

export interface FiltroPedidos {
  status?: StatusPedido;
  dataInicio?: string;
  dataFim?: string;
  clienteNome?: string;
  pagina?: number;
  limite?: number;
}

export interface ListaPedidos {
  data: Pedido[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface FechamentoResponse {
  id: string | null;
  data: string;
  totalPix: number;
  totalDinheiro: number;
  totalCartao: number;
  totalGeral: number;
  totalPedidos: number;
  ticketMedio: number;
  pedidosCancelados: number;
  pedidosEmAndamento: number;
  fundoTroco: number;
  dinheiroConferido: number | null;
  diferencaDinheiro: number | null;
  fechadoPor: { id: string; nome: string } | null;
  fechadoEm: string | null;
  obs: string | null;
  isFechado: boolean;
  motivoReabertura: string | null;
  reabertoEm: string | null;
  reabertoPor: { id: string; nome: string } | null;
}

export interface ResumoPeriodo {
  periodo: { inicio: string; fim: string };
  totalGeral: number;
  totalPix: number;
  totalDinheiro: number;
  totalCartao: number;
  totalPedidos: number;
  ticketMedio: number;
  totalCancelados: number;
  melhorDia: { data: string; total: number } | null;
  mediaDiaria: number;
  fechamentos: FechamentoResponse[];
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
