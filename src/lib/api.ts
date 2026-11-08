import { withRefreshLock } from "@/lib/auth-refresh";
import { definitiveAuthFailure } from "@/lib/functional";
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const ACCESS_TOKEN_KEY = "painel:accessToken";
export const REFRESH_TOKEN_KEY = "painel:refreshToken";

let accessToken: string | null = null;
let tokenVersion = 0;
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* armazenamento indisponível */ }
}

export interface BrowserSessionResponse {
  accessToken: string;
  expiresIn: number;
  usuario: Record<string, unknown>;
}

export const browserSession = {
  login(email: string, senha: string) {
    return withRefreshLock("painel:auth-refresh", () => axios.post<BrowserSessionResponse>("/api/session/login", { email, senha }, {
      headers: { "X-Session-Intent": "browser" }, timeout: 10_000,
    }));
  },
  refresh() {
    return withRefreshLock("painel:auth-refresh", () => axios.post<BrowserSessionResponse>("/api/session/refresh", {}, {
      headers: { "X-Session-Intent": "browser" }, timeout: 10_000,
    }));
  },
  logout() {
    return withRefreshLock("painel:auth-refresh", () => axios.post("/api/session/logout", {}, {
      headers: { "X-Session-Intent": "browser" }, timeout: 10_000,
    }));
  },
  password(access: string, senhaAtual: string, novaSenha: string) {
    return withRefreshLock("painel:auth-refresh", () => axios.post<BrowserSessionResponse>("/api/session/password", { senhaAtual, novaSenha }, {
      headers: { "X-Session-Intent": "browser", Authorization: `Bearer ${access}` }, timeout: 10_000,
    }));
  },
};

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export function getAccessToken(): string | null {
  return accessToken;
}

export function setTokens(access: string): void {
  accessToken = access;
  tokenVersion++;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch { /* armazenamento indisponível */ }
  }
}

export function clearTokens(): void {
  accessToken = null;
  tokenVersion++;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch { /* armazenamento indisponível */ }
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshFlight: Promise<string> | null = null;

// Unwrap { success, data } envelope from backend
api.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    response.data = body.data;
  }
  return response;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) return Promise.reject(error);
    const url = original.url || "";
    if ([/auth\/(?:cliente\/login|funcionario\/login|refresh|logout)(?:$|\?)/].some((pattern) => pattern.test(url))) return Promise.reject(error);
    original._retry = true;
    const sentAuthorization = String(original.headers?.Authorization || "");
    const failedAccess = sentAuthorization.startsWith("Bearer ") ? sentAuthorization.slice(7) : null;

    if (!refreshFlight) {
      refreshFlight = (async () => {
        // Another tab may have rotated the family while this request waited for the lock.
        const currentAccess = getAccessToken();
        if (currentAccess && currentAccess !== failedAccess) return currentAccess;
        const version = tokenVersion;
        try {
          const { data } = await browserSession.refresh();
          if (tokenVersion !== version) throw new Error("Sessão alterada");
          setTokens(data.accessToken);
          return data.accessToken as string;
        } catch (refreshError) {
          if (definitiveAuthFailure(refreshError) && tokenVersion === version) {
            clearTokens();
            if (typeof window !== "undefined") window.location.href = "/login";
          }
          throw refreshError;
        }
      })();
    }
    const flight = refreshFlight;
    try {
      const token = await flight;
      // Logout or a new login must invalidate a completed but not yet retried request.
      if (getAccessToken() !== token) throw new Error("Sessão alterada");
      original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
      return api(original);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    } finally {
      if (refreshFlight === flight) refreshFlight = null;
    }
  }
);

/** Mensagem de erro vinda da API (class-validator manda um array). */
export function mensagemErroApi(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}
