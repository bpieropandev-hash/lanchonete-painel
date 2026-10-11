"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { PedidoCard } from "@/components/pedidos/PedidoCard";
import { PedidoDetalheModal } from "@/components/pedidos/PedidoDetalheModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { getPedidosSocket, disconnectPedidosSocket } from "@/lib/socket";
import { useNotificacaoStore } from "@/store/notificacaoStore";
import { playNotification } from "@/lib/sound";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";

const COLUNAS: { status: StatusPedido[]; label: string; color: string }[] = [
  { status: ["NOVO"], label: "Novos", color: "bg-blue-100 text-blue-900 border-blue-300" },
  { status: ["PREPARANDO"], label: "Preparando", color: "bg-yellow-100 text-yellow-900 border-yellow-300" },
  {
    status: ["SAIU_ENTREGA", "PRONTO"],
    label: "Saiu p/ entrega · Aguardando retirada",
    color: "bg-purple-100 text-purple-900 border-purple-300",
  },
  { status: ["ENTREGUE"], label: "Finalizados (expediente)", color: "bg-green-100 text-green-900 border-green-300" },
];

function PedidosPageContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setNovosCount = useNotificacaoStore((s) => s.setNovosCount);
  const showToast = useToastStore((s) => s.show);

  const loadPedidos = useCallback(async () => {
    try {
      // A API calcula o expediente no fuso da loja. Antes usava a data UTC do
      // navegador e, depois das 21h, a tela ficava vazia.
      const limite = 50;
      let pagina = 1;
      let totalPaginas = 1;
      const acumulado: Pedido[] = [];

      do {
        const { data } = await api.get("/admin/pedidos", {
          params: { expedienteAtual: true, limite, pagina },
        });
        const body = data as
          | Pedido[]
          | { data: Pedido[]; totalPaginas?: number };
        if (Array.isArray(body)) {
          acumulado.push(...body);
          break;
        }
        acumulado.push(...(body.data ?? []));
        totalPaginas = body.totalPaginas ?? 1;
        pagina += 1;
      } while (pagina <= totalPaginas);

      setPedidos(acumulado.filter((p) => p.status !== "CANCELADO"));
    } catch {
      showToast("Erro ao carregar pedidos", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    const novos = pedidos.filter((p) => p.status === "NOVO").length;
    setNovosCount(novos);
  }, [pedidos, setNovosCount]);

  useEffect(() => {
    const socket = getPedidosSocket();

    // A cada (re)conexão: entra na sala e busca tudo de novo, porque os
    // eventos emitidos enquanto a conexão estava caída não são reenviados.
    let primeiraConexao = true;
    const onConnect = () => {
      socket.emit("entrar:painel", (resp?: { ok: boolean; erro?: string }) => {
        if (resp && !resp.ok) showToast(`Tempo real: ${resp.erro}`, "error");
      });
      if (!primeiraConexao) loadPedidos();
      primeiraConexao = false;
    };
    const onDisconnect = (motivo: string) => {
      if (motivo === "io client disconnect") return;
      showToast("Conexão em tempo real caiu. Reconectando...", "error");
    };
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    const onNovo = (pedido: Pedido) => {
      setPedidos((prev) => {
        if (prev.some((p) => p.id === pedido.id)) return prev;
        return [pedido, ...prev];
      });
      showToast(`Novo pedido #${pedido.numero}!`, "success");
      playNotification();
    };

    const onStatus = (payload: {
      id: string;
      numero: number;
      status: StatusPedido;
      whatsappLink?: string;
    }) => {
      setPedidos((prev) => {
        const exists = prev.find((p) => p.id === payload.id);
        if (!exists) {
          loadPedidos();
          return prev;
        }
        if (payload.status === "ENTREGUE" || payload.status === "CANCELADO") {
          loadPedidos();
          return prev;
        }
        return prev.map((p) =>
          p.id === payload.id ? { ...p, status: payload.status } : p
        );
      });
    };

    socket.on("pedido:novo", onNovo);
    socket.on("pedido:status", onStatus);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("pedido:novo", onNovo);
      socket.off("pedido:status", onStatus);
      disconnectPedidosSocket();
    };
  }, [loadPedidos, showToast]);

  const handleUpdated = (updated: Pedido) => {
    if (updated.status === "ENTREGUE" || updated.status === "CANCELADO") {
      loadPedidos();
    } else {
      setPedidos((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUNAS.map((col) => {
          const itens = pedidos.filter((p) => col.status.includes(p.status));
          return (
            <div key={col.label} className="flex flex-col">
              <div
                className={`mb-3 rounded-lg border-2 px-3 py-2 text-sm font-bold ${col.color}`}
              >
                {col.label} ({itens.length})
              </div>
              <div className="space-y-2">
                {itens.length === 0 ? (
                  <p className="rounded-lg border-2 border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
                    Nenhum pedido
                  </p>
                ) : (
                  itens.map((pedido) => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onClick={() => setSelectedId(pedido.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PedidoDetalheModal
        open={!!selectedId}
        pedidoId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdated}
      />
    </>
  );
}

export default function PedidosPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Pedidos">
        <PedidosPageContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
