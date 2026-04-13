import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

let pedidosSocket: Socket | null = null;

export function getPedidosSocket(): Socket {
  if (!pedidosSocket) {
    pedidosSocket = io(`${WS_URL}/pedidos`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return pedidosSocket;
}

export function disconnectPedidosSocket(): void {
  if (pedidosSocket) {
    pedidosSocket.disconnect();
    pedidosSocket = null;
  }
}
