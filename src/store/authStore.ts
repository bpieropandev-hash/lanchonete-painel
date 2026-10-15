import { createGeneration, definitiveAuthFailure } from "@/lib/functional";
import { create } from "zustand";
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/api";
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
  hydrationError: string | null;
  isHydrating: boolean;
  hasHydrated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const session = createGeneration();
let hydratePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set) => ({
  funcionario: null,
  isAuthenticated: false,
  hydrationError: null,
  isHydrating: false,
  hasHydrated: false,

  login: async (email, senha) => {
    hydratePromise = null;
    const current = session.begin();
    set({ hydrationError: null });
    const { data } = await api.post<AuthResponse>("/auth/funcionario/login", {
      email,
      senha,
    });
    if (!current()) return;
    setTokens(data.accessToken, data.refreshToken);
    const funcionario: Funcionario = {
      id: data.usuario.id,
      nome: data.usuario.nome,
      email: data.usuario.email || email,
      perfil: (data.usuario.perfil || "ATENDENTE") as PerfilUsuario,
    };
    set({ funcionario, isAuthenticated: true, hasHydrated: true, isHydrating: false });
  },

  logout: () => {
    hydratePromise = null;
    session.begin();
    set({ hydrationError: null });
    const refreshToken = getRefreshToken();
    if (refreshToken) void api.post("/auth/logout", { refreshToken }, {
      timeout: 5000, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    }).catch(() => undefined);
    clearTokens();
    set({ funcionario: null, isAuthenticated: false, isHydrating: false, hasHydrated: true });
  },

  hydrate: () => {
    if (hydratePromise) return hydratePromise;
    const task = (async () => {
      const current = session.begin();
      set({ hydrationError: null, isHydrating: true });
      const token = getAccessToken();
      if (!token && !getRefreshToken()) {
        set({ hasHydrated: true, isHydrating: false });
        return;
      }
      set({ isHydrating: true });
      try {
        const { data } = await api.get<MeResponse>("/auth/me");
        if (!current()) return;
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
      } catch (error) {
        if (!current()) return;
        if (!definitiveAuthFailure(error)) { set({ isHydrating: false, hasHydrated: true, hydrationError: "Não foi possível verificar sua sessão. Tente novamente." }); return; }
        clearTokens();
        set({
          funcionario: null,
          isAuthenticated: false,
          isHydrating: false,
          hasHydrated: true,
        });
      }
    })();
    hydratePromise = task;
    void task.finally(() => { if (hydratePromise === task) hydratePromise = null; }).catch(() => undefined);
    return task;
  },
}));
