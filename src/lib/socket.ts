import { io, Socket } from "socket.io-client";
import { api, getAccessToken } from "@/lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

let reconnect: ReturnType<typeof setTimeout> | undefined;
let pedidosSocket: Socket | null = null;

/**
 * Socket autenticado do namespace /pedidos. O token é lido a cada
 * (re)conexão. Se o servidor derrubar a conexão (token expirado), uma
 * chamada HTTP qualquer passa pelo interceptor do axios, que renova o
 * token, e então reconectamos.
 */
export function getPedidosSocket(): Socket {
  if (!pedidosSocket) {
    const socket = io(`${WS_URL}/pedidos`, {
      transports: ["websocket", "polling"],
      auth: (cb) => cb({ token: getAccessToken() }),
      reconnectionDelayMax: 10_000,
    });
    socket.on("disconnect", (motivo) => {
      if (motivo === "io server disconnect") {
        api
          .get("/auth/me")
          .then(() => {
            if (pedidosSocket !== socket) return;
            clearTimeout(reconnect);
            reconnect = setTimeout(() => { if (pedidosSocket === socket) socket.connect(); }, 1000);
          })
          .catch(() => undefined);
      }
    });
    pedidosSocket = socket;
  }
  return pedidosSocket;
}

export function disconnectPedidosSocket(): void {
  clearTimeout(reconnect);
  if (pedidosSocket) {
    pedidosSocket.removeAllListeners();
    pedidosSocket.disconnect();
    pedidosSocket = null;
  }
}
