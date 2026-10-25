import { NextRequest, NextResponse } from "next/server";

function origin(value: string | undefined, fallback: string): string {
  try { return new URL(value || fallback).origin; } catch { return ""; }
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";
  const api = origin(process.env.NEXT_PUBLIC_API_URL, "http://localhost:3000");
  const ws = origin(process.env.NEXT_PUBLIC_WS_URL, "http://localhost:3000");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${[api, ws, ws.replace(/^http/, "ws"), "https://viacep.com.br"].filter(Boolean).join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  // Always replace client-supplied values before Next renders its inline scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
