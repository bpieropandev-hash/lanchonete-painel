import { NextRequest, NextResponse } from "next/server";

type AccountKind = "cliente" | "funcionario";
type Action = "login" | "refresh" | "logout" | "password";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const NO_STORE = { "Cache-Control": "no-store" };

function cookieName(kind: AccountKind): string {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";
  return `${prefix}lanchonete-${kind}-refresh`;
}

function clearCookie(response: NextResponse, kind: AccountKind): void {
  response.cookies.set(cookieName(kind), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function setCookie(response: NextResponse, kind: AccountKind, token: string): void {
  response.cookies.set(cookieName(kind), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    priority: "high",
  });
}

function failure(status: number, message: string): NextResponse {
  return NextResponse.json({ message }, { status, headers: NO_STORE });
}

function apiUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured && process.env.NODE_ENV === "production") return null;
  try {
    const url = new URL(configured || "http://localhost:3000/api/v1");
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function backendPath(action: Action, kind: AccountKind): string {
  if (action === "login") return `/auth/${kind}/login`;
  if (action === "refresh") return "/auth/refresh";
  if (action === "logout") return "/auth/logout";
  return kind === "cliente" ? "/auth/me/cliente/senha" : "/auth/me/senha";
}

/** Same-origin BFF: o refresh nunca é devolvido ao JavaScript do navegador. */
export async function handleBrowserSession(
  request: NextRequest,
  actionName: string,
  kind: AccountKind,
): Promise<NextResponse> {
  if (!["login", "refresh", "logout", "password"].includes(actionName)) {
    return failure(404, "Rota não encontrada");
  }
  const action = actionName as Action;
  // POST com header customizado e Origin correto: impede CSRF inclusive se
  // cookies forem enviados por uma política de navegador inesperada.
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("x-session-intent") !== "browser"
  ) {
    return failure(403, "Origem não permitida");
  }

  const baseUrl = apiUrl();
  if (!baseUrl) return failure(503, "Serviço de autenticação indisponível");

  const refreshToken = request.cookies.get(cookieName(kind))?.value;
  if ((action === "refresh" || action === "logout") && !refreshToken) {
    return action === "logout"
      ? new NextResponse(null, { status: 204, headers: NO_STORE })
      : failure(401, "Sessão encerrada");
  }

  let body: unknown;
  if (action === "login" || action === "password") {
    try {
      body = await request.json();
    } catch {
      return failure(400, "Dados inválidos");
    }
  } else {
    body = { refreshToken };
  }

  const authorization = request.headers.get("authorization");
  if (action === "password" && !authorization?.startsWith("Bearer ")) {
    return failure(401, "Sessão encerrada");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}${backendPath(action, kind)}`, {
      method: action === "password" ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(action === "password" ? { Authorization: authorization! } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    const response = failure(503, "Serviço de autenticação indisponível");
    if (action === "logout") clearCookie(response, kind);
    return response;
  }

  if (action === "logout") {
    const response = new NextResponse(null, { status: 204, headers: NO_STORE });
    clearCookie(response, kind);
    return response;
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await upstream.json()) as Record<string, unknown>;
  } catch {
    return failure(502, "Resposta de autenticação inválida");
  }
  if (!upstream.ok) {
    const raw = payload.message;
    const message = upstream.status < 500 && typeof raw === "string"
      ? raw.slice(0, 200)
      : "Não foi possível autenticar agora";
    const response = failure(upstream.status, message);
    if (action === "refresh" && upstream.status === 401) clearCookie(response, kind);
    return response;
  }

  const data = (payload.data || payload) as Record<string, unknown>;
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    return failure(502, "Resposta de autenticação inválida");
  }
  const response = NextResponse.json(
    { accessToken: data.accessToken, expiresIn: data.expiresIn, usuario: data.usuario },
    { headers: NO_STORE },
  );
  setCookie(response, kind, data.refreshToken);
  return response;
}
