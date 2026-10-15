import { withRefreshLock } from "@/lib/auth-refresh";
import { definitiveAuthFailure } from "@/lib/functional";
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const ACCESS_TOKEN_KEY = "painel:accessToken";
export const REFRESH_TOKEN_KEY = "painel:refreshToken";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
      refreshFlight = withRefreshLock("painel:auth-refresh", async () => {
        // Another tab may have rotated the family while this request waited for the lock.
        const currentAccess = getAccessToken();
        const refreshToken = getRefreshToken();
        if (currentAccess && currentAccess !== failedAccess) return currentAccess;
        if (!refreshToken) {
          clearTokens();
          if (typeof window !== "undefined") window.location.href = "/login";
          throw error;
        }
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: 10_000 });
          const data = response.data?.data ?? response.data;
          if (getRefreshToken() !== refreshToken) throw new Error("Sessão alterada");
          setTokens(data.accessToken, data.refreshToken);
          return data.accessToken as string;
        } catch (refreshError) {
          if (definitiveAuthFailure(refreshError) && getRefreshToken() === refreshToken) {
            clearTokens();
            if (typeof window !== "undefined") window.location.href = "/login";
          }
          throw refreshError;
        }
      });
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
