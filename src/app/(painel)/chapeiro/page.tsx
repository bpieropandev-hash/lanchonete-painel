"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ChefHat,
  Bike,
  LogOut,
  Volume2,
  Bell,
  Store,
  WifiOff,
  Maximize,
  PackageX,
  MessageSquareWarning,
} from "lucide-react";
import axios from "axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import { getPedidosSocket, disconnectPedidosSocket } from "@/lib/socket";
import { playNotification, unlockAudio } from "@/lib/sound";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";
import { PainelEsgotados } from "@/components/cozinha/PainelEsgotados";

/** Minutos desde o pedido a partir dos quais o card muda de cor. */
const ALERTA_MIN = 15;
const ATRASO_MIN = 25;
/** Pedido novo sem ninguém iniciar o preparo: repete o aviso sonoro. */
const REPETIR_SOM_MS = 20_000;
/** Tempo para o segundo toque confirmar "pronto/saiu". */
const JANELA_CONFIRMACAO_MS = 4_000;

type WakeLockSentinelLike = { release: () => Promise<void> };

function minutosDesde(iso: string, agora: number): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
}

function ChapeiroPageContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [iniciado, setIniciado] = useState(false);
  const [esgotadosAberto, setEsgotadosAberto] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [conectado, setConectado] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());
  const showToast = useToastStore((s) => s.show);
  const logout = useAuthStore((s) => s.logout);
  const somAtivoRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const loadPedidos = useCallback(async () => {
    try {
      const res = await api.get("/admin/pedidos/ativos");
      const list: Pedido[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPedidos(list.filter((p) => p.status === "NOVO" || p.status === "PREPARANDO"));
    } catch {
      showToast("Erro ao carregar pedidos", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Relógio: atualiza os minutos de espera e as cores a cada 15s.
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Fila sempre do mais antigo para o mais novo (o primeiro a chegar é o
  // primeiro a sair), não importa se veio do carregamento ou do tempo real.
  const fila = useMemo(
    () =>
      [...pedidos].sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
      ),
    [pedidos]
  );
  const novos = fila.filter((p) => p.status === "NOVO").length;
  const emPreparo = fila.length - novos;

  useEffect(() => {
    const socket = getPedidosSocket();

    // A cada (re)conexão: entra na sala e recarrega a fila. Sem isso, um
    // pedido feito enquanto o Wi-Fi da cozinha caiu nunca aparecia.
    let primeiraConexao = true;
    const onConnect = () => {
      setConectado(true);
      socket.emit("entrar:chapeiro", (resp?: { ok: boolean; erro?: string }) => {
        if (resp && !resp.ok) showToast(`Tempo real: ${resp.erro}`, "error");
      });
      if (!primeiraConexao) loadPedidos();
      primeiraConexao = false;
    };
    const onDisconnect = (motivo: string) => {
      if (motivo !== "io client disconnect") setConectado(false);
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const onNovo = (pedido: Pedido) => {
      setPedidos((prev) => (prev.some((p) => p.id === pedido.id) ? prev : [...prev, pedido]));
      if (somAtivoRef.current) playNotification();
    };

    const onStatus = (payload: { id: string; numero: number; status: StatusPedido }) => {
      // Saiu da cozinha (pronto, saiu, cancelado...): tira da fila.
      if (payload.status !== "NOVO" && payload.status !== "PREPARANDO") {
        setPedidos((prev) => prev.filter((p) => p.id !== payload.id));
        if (payload.status === "CANCELADO") {
          showToast(`Pedido #${payload.numero} foi CANCELADO, não prepare`, "error");
          if (somAtivoRef.current) playNotification();
        }
        return;
      }
      setPedidos((prev) =>
        prev.map((p) => (p.id === payload.id ? { ...p, status: payload.status } : p))
      );
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

  // Plano B: se o tempo real cair, recarrega a fila a cada 20s.
  useEffect(() => {
    if (conectado) return;
    const timer = setInterval(loadPedidos, 20_000);
    return () => clearInterval(timer);
  }, [conectado, loadPedidos]);

  // Enquanto houver pedido novo sem ninguém iniciar, o aviso se repete.
  useEffect(() => {
    if (!iniciado || novos === 0) return;
    const timer = setInterval(() => playNotification(), REPETIR_SOM_MS);
    return () => clearInterval(timer);
  }, [iniciado, novos]);

  // Mantém a tela ligada (Wake Lock). O navegador solta o bloqueio quando a
  // aba sai de foco; pedimos de novo ao voltar.
  const pedirTelaLigada = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (tipo: "screen") => Promise<WakeLockSentinelLike> };
    };
    try {
      wakeLockRef.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!iniciado) return;
    const aoVoltar = () => {
      if (document.visibilityState === "visible") pedirTelaLigada();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      wakeLockRef.current?.release().catch(() => undefined);
    };
  }, [iniciado, pedirTelaLigada]);

  // O navegador só libera som depois de um toque na tela: por isso a tela
  // começa com um aviso grande que ninguém consegue ignorar.
  const iniciarTurno = async () => {
    unlockAudio();
    somAtivoRef.current = true;
    setIniciado(true);
    playNotification();
    await pedirTelaLigada();
  };

  const telaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const avancar = async (pedido: Pedido) => {
    const next: StatusPedido =
      pedido.status === "NOVO"
        ? "PREPARANDO"
        : pedido.tipoEntrega === "RETIRADA"
          ? "PRONTO"
          : "SAIU_ENTREGA";

    // Tirar da fila não tem volta: exige um segundo toque para confirmar.
    if (next !== "PREPARANDO" && confirmando !== pedido.id) {
      setConfirmando(pedido.id);
      setTimeout(
        () => setConfirmando((atual) => (atual === pedido.id ? null : atual)),
        JANELA_CONFIRMACAO_MS
      );
      return;
    }

    setConfirmando(null);
    setActing(pedido.id);
    try {
      await api.patch<Pedido>(`/admin/pedidos/${pedido.id}/status`, { status: next });
      if (next !== "PREPARANDO") {
        setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      } else {
        setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, status: next } : p)));
      }
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data
          ? (err.response.data as { message?: string }).message || "Erro ao atualizar"
          : "Erro ao atualizar";
      showToast(msg, "error");
      // Provavelmente o pedido mudou em outra tela (ex.: cancelado)
      loadPedidos();
    } finally {
      setActing(null);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const hora = new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {!iniciado && (
        <button
          type="button"
          onClick={iniciarTurno}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-zinc-950/95 p-6 text-center"
        >
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-500">
            <Volume2 size={56} />
          </span>
          <span className="text-4xl font-black sm:text-5xl">Toque para começar</span>
          <span className="max-w-xl text-xl text-zinc-300">
            Liga o som de pedido novo e mantém a tela acesa. Faça isso sempre que abrir ou
            recarregar esta tela.
          </span>
        </button>
      )}

      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <ChefHat size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">Cozinha</h1>
            <p className="text-sm text-zinc-400">
              <span className={novos > 0 ? "font-bold text-yellow-400" : ""}>
                {novos} {novos === 1 ? "novo" : "novos"}
              </span>{" "}
              · {emPreparo} em preparo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!conectado && (
            <span className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
              <WifiOff size={18} />
              <span className="hidden sm:inline">Sem conexão, atualizando a cada 20s</span>
            </span>
          )}
          <span className="hidden font-mono text-2xl font-bold tabular-nums text-zinc-300 sm:inline">
            {hora}
          </span>
          <button
            onClick={() => setEsgotadosAberto(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            <PackageX size={18} />
            <span className="hidden sm:inline">Acabou algo?</span>
          </button>
          <button
            onClick={telaCheia}
            aria-label="Tela cheia"
            className="rounded-lg bg-zinc-800 p-2 text-white hover:bg-zinc-700"
          >
            <Maximize size={20} />
          </button>
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
          <p className="py-12 text-center text-2xl text-zinc-400">Carregando pedidos...</p>
        ) : fila.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <ChefHat size={64} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-3xl font-bold text-zinc-500">Nenhum pedido na fila</p>
              <p className="mt-2 text-lg text-zinc-600">Aguardando novos pedidos...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {fila.map((pedido, posicao) => {
              const isNovo = pedido.status === "NOVO";
              const minutos = minutosDesde(pedido.criadoEm, agora);
              const atrasado = minutos >= ATRASO_MIN;
              const alerta = !atrasado && minutos >= ALERTA_MIN;
              const retirada = pedido.tipoEntrega === "RETIRADA";
              const aguardandoConfirmacao = confirmando === pedido.id;

              const borda = atrasado
                ? "border-red-500 bg-red-500/10"
                : isNovo
                  ? "border-yellow-500 bg-yellow-500/10"
                  : alerta
                    ? "border-orange-400 bg-orange-500/10"
                    : "border-blue-500 bg-blue-500/10";

              return (
                <div
                  key={pedido.id}
                  className={`flex flex-col rounded-2xl border-4 p-4 shadow-xl transition-all ${borda}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-4xl font-black sm:text-5xl">#{pedido.numero}</p>
                      <p className="mt-1 flex items-center gap-1 text-base font-bold">
                        {retirada ? (
                          <span className="flex items-center gap-1 text-sky-300">
                            <Store size={18} /> RETIRADA
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-zinc-300">
                            <Bike size={18} /> ENTREGA
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono text-3xl font-black tabular-nums ${
                          atrasado ? "text-red-400" : alerta ? "text-orange-300" : "text-zinc-200"
                        }`}
                      >
                        {minutos} min
                      </p>
                      <p className="text-xs uppercase tracking-wide text-zinc-400">
                        {posicao === 0 ? "próximo" : `${posicao + 1}º da fila`}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold ${
                          // Só a etiqueta pisca: piscar o card inteiro apagava o texto
                          isNovo
                            ? "animate-pulse-slow bg-yellow-500 text-zinc-900"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {isNovo ? "Novo" : "Preparando"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 flex-1 space-y-2 border-t border-zinc-700 pt-3">
                    {pedido.itens.map((item) => (
                      <div key={item.id} className="text-xl">
                        <p className="font-bold">
                          <span className="text-primary-400">{item.quantidade}x</span>{" "}
                          {item.nomeProdutoSnapshot}
                          {item.nomeVarianteSnapshot && (
                            <span className="text-primary-300"> — {item.nomeVarianteSnapshot}</span>
                          )}
                        </p>
                        {item.personalizacoes && (
                          <div className="ml-6 text-lg">
                            {item.personalizacoes.removidos.length > 0 && (
                              <p className="font-semibold text-red-400">
                                ✗ SEM: {item.personalizacoes.removidos.join(", ")}
                              </p>
                            )}
                            {item.personalizacoes.adicionados.length > 0 && (
                              <p className="font-semibold text-green-400">
                                + {item.personalizacoes.adicionados.map((a) => a.nome).join(", ")}
                              </p>
                            )}
                            {item.personalizacoes.observacao && (
                              <p className="font-semibold text-yellow-300">
                                ➜ {item.personalizacoes.observacao}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {pedido.obs && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-yellow-500/20 px-3 py-2">
                      <MessageSquareWarning size={20} className="mt-0.5 shrink-0 text-yellow-300" />
                      <p className="text-lg font-semibold text-yellow-200">{pedido.obs}</p>
                    </div>
                  )}

                  <button
                    onClick={() => avancar(pedido)}
                    disabled={acting === pedido.id}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-5 text-2xl font-bold transition-colors disabled:opacity-60 ${
                      aguardandoConfirmacao
                        ? "bg-green-500 text-white ring-4 ring-green-300"
                        : isNovo
                          ? "bg-yellow-500 text-zinc-900 hover:bg-yellow-400"
                          : "bg-blue-500 text-white hover:bg-blue-400"
                    }`}
                  >
                    {acting === pedido.id ? (
                      "..."
                    ) : isNovo ? (
                      <>
                        <ChefHat size={26} /> Iniciar preparo
                      </>
                    ) : aguardandoConfirmacao ? (
                      <>Toque de novo para confirmar</>
                    ) : retirada ? (
                      <>
                        <Bell size={26} /> Pronto p/ retirada
                      </>
                    ) : (
                      <>
                        <Bike size={26} /> Pronto / Saiu
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <PainelEsgotados aberto={esgotadosAberto} onFechar={() => setEsgotadosAberto(false)} />
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
