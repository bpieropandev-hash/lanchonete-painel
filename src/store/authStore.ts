import { createGeneration, definitiveAuthFailure } from "@/lib/functional";
import { create } from "zustand";
import { api, browserSession, clearTokens, setTokens } from "@/lib/api";
import type { Funcionario, PerfilUsuario } from "@/types";

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
  logout: () => Promise<void>;
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
    const { data } = await browserSession.login(email, senha);
    if (!current()) return;
    setTokens(data.accessToken);
    const funcionario: Funcionario = {
      id: String(data.usuario.id),
      nome: String(data.usuario.nome),
      email: String(data.usuario.email || email),
      perfil: (data.usuario.perfil || "ATENDENTE") as PerfilUsuario,
    };
    set({ funcionario, isAuthenticated: true, hasHydrated: true, isHydrating: false });
  },

  logout: async () => {
    hydratePromise = null;
    session.begin();
    set({ hydrationError: null });
    const revogacao = browserSession.logout();
    clearTokens();
    set({ funcionario: null, isAuthenticated: false, isHydrating: false, hasHydrated: true });
    await revogacao.catch(() => undefined);
  },

  hydrate: () => {
    if (hydratePromise) return hydratePromise;
    const task = (async () => {
      const current = session.begin();
      set({ hydrationError: null, isHydrating: true });
      set({ isHydrating: true });
      try {
        const { data: sessionData } = await browserSession.refresh();
        if (!current()) return;
        setTokens(sessionData.accessToken);
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
