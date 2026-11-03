import { create } from "zustand";
import { api } from "@/lib/api";
import type { ConfigEstoque, ResumoEstoque } from "@/types/estoque";

interface EstoqueStore {
  /** Nulo até a primeira resposta (ou se a API falhar): nesse caso o menu fica escondido. */
  config: ConfigEstoque | null;
  /** Já houve uma resposta (ou falha) da API? Antes disso a tela de estoque espera. */
  carregado: boolean;
  /** Insumos a repor (baixo + zerado + negativo): número do selo do menu, só ADMIN. */
  aRepor: number;
  carregarConfig: () => Promise<void>;
  carregarSelo: () => Promise<void>;
  /** Habilita/desabilita o módulo e liga/pausa a baixa. Lança em caso de erro da API. */
  definirConfig: (
    mudancas: Partial<Pick<ConfigEstoque, "habilitado" | "ativo">>,
  ) => Promise<ConfigEstoque>;
}

export const useEstoqueStore = create<EstoqueStore>((set) => ({
  config: null,
  carregado: false,
  aRepor: 0,

  carregarConfig: async () => {
    try {
      const { data } = await api.get<ConfigEstoque>("/admin/estoque/config");
      set({ config: data, carregado: true });
    } catch {
      // Sem resposta, o módulo é tratado como desligado: o painel fica como antes.
      set({ config: null, carregado: true, aRepor: 0 });
    }
  },

  carregarSelo: async () => {
    try {
      const { data } = await api.get<ResumoEstoque>("/admin/estoque/resumo");
      set({ aRepor: data.insumos.aRepor + data.pedidosSemBaixa });
    } catch {
      /* o selo é só um aviso: falhar não deve atrapalhar a tela */
    }
  },

  definirConfig: async (mudancas) => {
    const { data } = await api.put<ConfigEstoque>("/admin/estoque/config", mudancas);
    set((s) => ({ config: data, aRepor: data.habilitado ? s.aRepor : 0 }));
    return data;
  },
}));
