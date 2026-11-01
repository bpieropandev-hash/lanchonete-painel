import { create } from "zustand";
import { api } from "@/lib/api";
import { NOME_LOJA } from "@/lib/marca";
import type { AparenciaLoja } from "@/types";

interface MarcaState {
  nome: string;
  logoUrl: string | null;
  /** Dados da loja para o cabeçalho da notinha impressa. */
  enderecoLoja: string | null;
  instagram: string | null;
  whatsappLoja: string | null;
  carregado: boolean;
  carregar: () => Promise<void>;
  aplicar: (aparencia: AparenciaLoja) => void;
}

/**
 * Nome e logo da loja para o menu e o login, mais endereço, Instagram e
 * WhatsApp para o cabeçalho da notinha. Vêm da API; sem nada configurado,
 * usa o nome do build.
 */
export const useMarcaStore = create<MarcaState>((set, get) => ({
  nome: NOME_LOJA,
  logoUrl: null,
  enderecoLoja: null,
  instagram: null,
  whatsappLoja: null,
  carregado: false,
  carregar: async () => {
    if (get().carregado) return;
    try {
      const { data } = await api.get<{
        aparencia?: AparenciaLoja;
        whatsappLoja?: string | null;
      }>("/loja/status");
      if (data.aparencia) get().aplicar(data.aparencia);
      if (data.whatsappLoja !== undefined) set({ whatsappLoja: data.whatsappLoja });
    } catch {
      // Sem a API o painel continua com o nome do build.
    } finally {
      set({ carregado: true });
    }
  },
  aplicar: (aparencia) =>
    set({
      nome: aparencia.nomeLoja || NOME_LOJA,
      logoUrl: aparencia.logoUrl,
      enderecoLoja: aparencia.enderecoLoja ?? null,
      instagram: aparencia.instagram ?? null,
    }),
}));
