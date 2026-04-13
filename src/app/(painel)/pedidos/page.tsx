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
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";

const COLUNAS: { status: StatusPedido; label: string; color: string }[] = [
  { status: "NOVO", label: "Novos", color: "bg-blue-100 text-blue-900 border-blue-300" },
  { status: "PREPARANDO", label: "Preparando", color: "bg-yellow-100 text-yellow-900 border-yellow-300" },
  { status: "SAIU_ENTREGA", label: "Saiu para Entrega", color: "bg-purple-100 text-purple-900 border-purple-300" },
  { status: "ENTREGUE", label: "Entregues (hoje)", color: "bg-green-100 text-green-900 border-green-300" },
];

function PedidosPageContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setNovosCount = useNotificacaoStore((s) => s.setNovosCount);
  const showToast = useToastStore((s) => s.show);

  const loadPedidos = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await api.get("/admin/pedidos", {
        params: { dataInicio: today, limite: 200 },
      });
      const list: Pedido[] = Array.isArray(data) ? data : data?.data ?? [];
      setPedidos(list.filter((p) => p.status !== "CANCELADO"));
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

    const onConnect = () => {
      socket.emit("entrar:painel");
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    const onNovo = (pedido: Pedido) => {
      setPedidos((prev) => {
        if (prev.some((p) => p.id === pedido.id)) return prev;
        return [pedido, ...prev];
      });
      showToast(`Novo pedido #${pedido.numero}!`, "success");
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
          const itens = pedidos.filter((p) => p.status === col.status);
          return (
            <div key={col.status} className="flex flex-col">
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
