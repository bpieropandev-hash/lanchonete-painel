"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { PedidoCard } from "@/components/pedidos/PedidoCard";
import { PedidoDetalheModal } from "@/components/pedidos/PedidoDetalheModal";
import { ControleMovimento } from "@/components/loja/ControleMovimento";
import { formatBRL } from "@/lib/format";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { getPedidosSocket, disconnectPedidosSocket } from "@/lib/socket";
import { useNotificacaoStore } from "@/store/notificacaoStore";
import { playNotification } from "@/lib/sound";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";

const COLUNAS: { status: StatusPedido[]; label: string; ponto: string }[] = [
  { status: ["AGUARDANDO_CONFIRMACAO"], label: "Aguardando confirmação", ponto: "bg-emerald-500" },
  { status: ["NOVO"], label: "Novos", ponto: "bg-blue-500" },
  { status: ["PREPARANDO"], label: "Em preparo", ponto: "bg-amber-500" },
  { status: ["SAIU_ENTREGA", "PRONTO"], label: "Prontos e em entrega", ponto: "bg-violet-500" },
  { status: ["ENTREGUE"], label: "Concluídos", ponto: "bg-gray-400" },
];

function minutosDesde(iso: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
}

function PedidosPageContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cancelados, setCancelados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());
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
      setCancelados(acumulado.filter((p) => p.status === "CANCELADO").length);
    } catch {
      showToast("Não foi possível carregar os pedidos.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Atualiza o tempo de espera dos cards a cada 30 s.
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const novos = pedidos.filter(
      (p) => p.status === "NOVO" || p.status === "AGUARDANDO_CONFIRMACAO"
    ).length;
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
      showToast(
        pedido.status === "AGUARDANDO_CONFIRMACAO"
          ? `Pedido #${pedido.numero}: aguardando confirmação pelo WhatsApp`
          : `Novo pedido #${pedido.numero}!`,
        "success"
      );
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

  // Números do expediente com o que já está na tela. "Aguardando confirmação"
  // fica de fora: ainda pode expirar sem virar venda.
  const validos = pedidos.filter((p) => p.status !== "AGUARDANDO_CONFIRMACAO");
  const totalVendido = validos.reduce((acc, p) => acc + parseFloat(p.total), 0);
  const indicadores = [
    { rotulo: "Pedidos no expediente", valor: String(validos.length) },
    { rotulo: "Total em pedidos", valor: formatBRL(totalVendido) },
    { rotulo: "Ticket médio", valor: validos.length ? formatBRL(totalVendido / validos.length) : "—" },
    { rotulo: "Cancelados", valor: String(cancelados) },
  ];

  return (
    <>
      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 lg:grid-cols-4">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="bg-white px-4 py-3">
            <dt className="text-xs text-gray-500">{i.rotulo}</dt>
            <dd className="mt-0.5 text-xl font-semibold tracking-tight text-gray-900">{i.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLUNAS.map((col) => {
          const itens = pedidos.filter((p) => col.status.includes(p.status));
          return (
            <section key={col.label} className="flex flex-col rounded-lg bg-gray-100 p-2 xl:min-h-[calc(100vh-14rem)]">
              <h2 className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-sm font-semibold text-gray-800">
                <span className={`h-2 w-2 rounded-sm ${col.ponto}`} />
                {col.label}
                <span className="font-normal text-gray-500">{itens.length}</span>
              </h2>
              <div className="space-y-2">
                {itens.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 px-3 py-5 text-center text-xs text-gray-400">
                    Nenhum pedido
                  </p>
                ) : (
                  itens.map((pedido) => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      minutos={minutosDesde(pedido.criadoEm, agora)}
                      onClick={() => setSelectedId(pedido.id)}
                    />
                  ))
                )}
              </div>
            </section>
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
      <PainelShell title="Pedidos" subtitle="Expediente atual" actions={<ControleMovimento />}>
        <PedidosPageContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
