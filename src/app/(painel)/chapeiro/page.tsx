"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChefHat, Bike, LogOut, Volume2, VolumeX, Clock } from "lucide-react";
import axios from "axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import { getPedidosSocket, disconnectPedidosSocket } from "@/lib/socket";
import { playNotification, unlockAudio } from "@/lib/sound";
import { tempoDesde, statusLabel, formatBRL } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";

function ChapeiroPageContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);
  const logout = useAuthStore((s) => s.logout);
  const audioEnabledRef = useRef(false);

  const loadPedidos = useCallback(async () => {
    try {
      const res = await api.get("/admin/pedidos/ativos");
      const list: Pedido[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPedidos(
        list.filter((p) => p.status === "NOVO" || p.status === "PREPARANDO")
      );
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
    const socket = getPedidosSocket();

    const onConnect = () => {
      socket.emit("entrar:chapeiro");
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    const onNovo = (pedido: Pedido) => {
      setPedidos((prev) => {
        if (prev.some((p) => p.id === pedido.id)) return prev;
        return [pedido, ...prev];
      });
      if (audioEnabledRef.current) {
        playNotification();
      }
    };

    const onStatus = (payload: {
      id: string;
      numero: number;
      status: StatusPedido;
    }) => {
      if (payload.status === "SAIU_ENTREGA" || payload.status === "CANCELADO") {
        setPedidos((prev) => prev.filter((p) => p.id !== payload.id));
        return;
      }
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === payload.id ? { ...p, status: payload.status } : p
        )
      );
    };

    socket.on("pedido:novo", onNovo);
    socket.on("pedido:status", onStatus);

    return () => {
      socket.off("connect", onConnect);
      socket.off("pedido:novo", onNovo);
      socket.off("pedido:status", onStatus);
      disconnectPedidosSocket();
    };
  }, []);

  const enableAudio = () => {
    unlockAudio();
    setAudioEnabled(true);
    audioEnabledRef.current = true;
    playNotification();
    showToast("Notificações sonoras ativadas", "success");
  };

  const handleAvancar = async (pedido: Pedido) => {
    const next: StatusPedido =
      pedido.status === "NOVO" ? "PREPARANDO" : "SAIU_ENTREGA";
    setActing(pedido.id);
    try {
      await api.patch<Pedido>(`/admin/pedidos/${pedido.id}/status`, {
        status: next,
      });
      if (next === "SAIU_ENTREGA") {
        setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      } else {
        setPedidos((prev) =>
          prev.map((p) => (p.id === pedido.id ? { ...p, status: next } : p))
        );
      }
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data
          ? (err.response.data as { message?: string }).message ||
            "Erro ao atualizar"
          : "Erro ao atualizar";
      showToast(msg, "error");
    } finally {
      setActing(null);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700 bg-zinc-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <ChefHat size={22} />
          </div>
          <h1 className="text-xl font-bold sm:text-2xl">Tela do Chapeiro</h1>
        </div>
        <div className="flex items-center gap-2">
          {!audioEnabled ? (
            <button
              onClick={enableAudio}
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-yellow-400"
            >
              <VolumeX size={18} />
              Ativar som
            </button>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-green-600/20 px-3 py-2 text-sm font-medium text-green-400">
              <Volume2 size={18} />
              Som ativo
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {loading ? (
          <p className="py-12 text-center text-2xl text-zinc-400">
            Carregando pedidos...
          </p>
        ) : pedidos.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <ChefHat size={64} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-3xl font-bold text-zinc-500">
                Nenhum pedido na fila
              </p>
              <p className="mt-2 text-lg text-zinc-600">
                Aguardando novos pedidos...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pedidos.map((pedido) => {
              const isNovo = pedido.status === "NOVO";
              return (
                <div
                  key={pedido.id}
                  className={`rounded-2xl border-4 p-4 shadow-xl transition-all ${
                    isNovo
                      ? "animate-pulse-slow border-yellow-500 bg-yellow-500/10"
                      : "border-blue-500 bg-blue-500/10"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-4xl font-black sm:text-5xl">
                        #{pedido.numero}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-base text-zinc-300">
                        <Clock size={16} />
                        {tempoDesde(pedido.criadoEm)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        isNovo
                          ? "bg-yellow-500 text-zinc-900"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {statusLabel(pedido.status)}
                    </span>
                  </div>

                  <div className="mb-3 space-y-2 border-t border-zinc-700 pt-3">
                    {pedido.itens.map((item) => (
                      <div key={item.id} className="text-lg">
                        <p className="font-bold">
                          <span className="text-primary-400">
                            {item.quantidade}x
                          </span>{" "}
                          {item.nomeProdutoSnapshot}
                        </p>
                        {item.personalizacoes && (
                          <div className="ml-6 text-base">
                            {item.personalizacoes.removidos.length > 0 && (
                              <p className="text-red-400">
                                ✗ Sem:{" "}
                                {item.personalizacoes.removidos.join(", ")}
                              </p>
                            )}
                            {item.personalizacoes.adicionados.length > 0 && (
                              <p className="text-green-400">
                                ✓ Adicionar:{" "}
                                {item.personalizacoes.adicionados
                                  .map((a) => a.nome)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                        {item.obs && (
                          <p className="ml-6 text-base italic text-yellow-300">
                            ⚠ {item.obs}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {pedido.obs && (
                    <div className="mb-3 rounded-lg bg-yellow-500/20 px-3 py-2">
                      <p className="text-base font-semibold text-yellow-300">
                        Obs: {pedido.obs}
                      </p>
                    </div>
                  )}

                  <p className="mb-3 text-sm text-zinc-400">
                    Total: {formatBRL(pedido.total)}
                  </p>

                  <button
                    onClick={() => handleAvancar(pedido)}
                    disabled={acting === pedido.id}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-xl font-bold transition-colors disabled:opacity-60 ${
                      isNovo
                        ? "bg-yellow-500 text-zinc-900 hover:bg-yellow-400"
                        : "bg-blue-500 text-white hover:bg-blue-400"
                    }`}
                  >
                    {isNovo ? (
                      <>
                        <ChefHat size={24} />
                        {acting === pedido.id ? "..." : "Iniciar Preparo"}
                      </>
                    ) : (
                      <>
                        <Bike size={24} />
                        {acting === pedido.id ? "..." : "Pronto / Saiu"}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChapeiroPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "CHAPEIRO"]}>
      <ChapeiroPageContent />
    </ProtectedRoute>
  );
}
