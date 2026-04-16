export type PerfilUsuario = "ADMIN" | "ATENDENTE" | "CHAPEIRO" | "ENTREGADOR";

export type StatusPedido =
  | "NOVO"
  | "PREPARANDO"
  | "SAIU_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO";

export type TipoPagamento = "PIX" | "DINHEIRO" | "CARTAO";

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
  ingredientes?: Ingrediente[];
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
  adicionados: { nome: string; preco: string }[];
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
  pagamento: TipoPagamento;
  subtotal: string;
  taxaEntrega: string;
  total: string;
  obs: string | null;
  enderecoEntregaSnapshot: EnderecoSnapshot;
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
