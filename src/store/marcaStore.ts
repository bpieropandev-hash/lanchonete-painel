import { create } from "zustand";
import { api } from "@/lib/api";
import { NOME_LOJA } from "@/lib/marca";
import type { AparenciaLoja } from "@/types";

interface MarcaState {
  nome: string;
  logoUrl: string | null;
  carregado: boolean;
  carregar: () => Promise<void>;
  aplicar: (aparencia: AparenciaLoja) => void;
}

/**
 * Nome e logo da loja para o menu e o login. Vêm da Aparência (API); sem
 * nada configurado, usa o nome do build.
 */
export const useMarcaStore = create<MarcaState>((set, get) => ({
  nome: NOME_LOJA,
  logoUrl: null,
  carregado: false,
  carregar: async () => {
    if (get().carregado) return;
    try {
      const { data } = await api.get<{ aparencia?: AparenciaLoja }>("/loja/status");
      if (data.aparencia) get().aplicar(data.aparencia);
    } catch {
      // Sem a API o painel continua com o nome do build.
    } finally {
      set({ carregado: true });
    }
  },
  aplicar: (aparencia) =>
    set({ nome: aparencia.nomeLoja || NOME_LOJA, logoUrl: aparencia.logoUrl }),
}));
