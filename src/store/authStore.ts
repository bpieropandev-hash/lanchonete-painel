import { create } from "zustand";
import { api, clearTokens, getAccessToken, setTokens } from "@/lib/api";
import type { AuthResponse, Funcionario, PerfilUsuario } from "@/types";

interface MeResponse {
  id?: string;
  sub?: string;
  nome?: string;
  email?: string;
  perfil?: PerfilUsuario;
}

interface AuthStore {
  funcionario: Funcionario | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hasHydrated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  funcionario: null,
  isAuthenticated: false,
  isHydrating: false,
  hasHydrated: false,

  login: async (email, senha) => {
    const { data } = await api.post<AuthResponse>("/auth/funcionario/login", {
      email,
      senha,
    });
    setTokens(data.accessToken, data.refreshToken);
    const funcionario: Funcionario = {
      id: data.usuario.id,
      nome: data.usuario.nome,
      email: data.usuario.email || email,
      perfil: (data.usuario.perfil || "ATENDENTE") as PerfilUsuario,
    };
    set({ funcionario, isAuthenticated: true, hasHydrated: true });
  },

  logout: () => {
    clearTokens();
    set({ funcionario: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ hasHydrated: true });
      return;
    }
    set({ isHydrating: true });
    try {
      const { data } = await api.get<MeResponse>("/auth/me");
      const funcionario: Funcionario = {
        id: data.id || data.sub || "",
        nome: data.nome || "",
        email: data.email || "",
        perfil: (data.perfil || "ATENDENTE") as PerfilUsuario,
      };
      set({
        funcionario,
        isAuthenticated: true,
        isHydrating: false,
        hasHydrated: true,
      });
    } catch {
      clearTokens();
      set({
        funcionario: null,
        isAuthenticated: false,
        isHydrating: false,
        hasHydrated: true,
      });
    }
  },
}));
