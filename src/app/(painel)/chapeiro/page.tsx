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
      showToast("Não foi possível carregar os pedidos.", "error");
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
          showToast(`Pedido #${payload.numero} cancelado. Não prepare.`, "error");
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
          ? (err.response.data as { message?: string }).message || "Não foi possível atualizar."
          : "Não foi possível atualizar.";
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
    <div className="min-h-screen bg-zinc-950 text-white">
      {!iniciado && (
        <button
          type="button"
          onClick={iniciarTurno}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-zinc-950/95 p-6 text-center"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800">
            <Volume2 size={56} />
          </span>
          <span className="text-4xl font-bold sm:text-5xl">Toque para começar</span>
          <span className="max-w-xl text-xl text-zinc-300">
            Isso liga o aviso sonoro de pedido novo e mantém a tela acesa. Necessário sempre que
            a tela for aberta ou recarregada.
          </span>
        </button>
      )}

      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Cozinha</h1>
          <span className={`rounded-md px-2.5 py-1 text-sm ${novos > 0 ? "bg-yellow-400 font-semibold text-zinc-900" : "bg-zinc-800 text-zinc-300"}`}>
            {novos} {novos === 1 ? "novo" : "novos"}
          </span>
          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-300">{emPreparo} em preparo</span>
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
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <PackageX size={18} />
            <span className="hidden sm:inline">Itens esgotados</span>
          </button>
          <button
            onClick={telaCheia}
            aria-label="Tela cheia"
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800"
          >
            <Maximize size={20} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {loading ? (
          <p className="py-12 text-center text-2xl text-zinc-400">Carregando pedidos…</p>
        ) : fila.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <ChefHat size={64} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-3xl font-bold text-zinc-500">Nenhum pedido na fila</p>
              <p className="mt-2 text-lg text-zinc-600">Os pedidos novos aparecem aqui com aviso sonoro.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {fila.map((pedido, posicao) => {
              const isNovo = pedido.status === "NOVO";
              const minutos = minutosDesde(pedido.criadoEm, agora);
              const atrasado = minutos >= ATRASO_MIN;
              const alerta = !atrasado && minutos >= ALERTA_MIN;
              const retirada = pedido.tipoEntrega === "RETIRADA";
              const aguardandoConfirmacao = confirmando === pedido.id;

              // A cor do topo do ticket diz há quanto tempo o pedido espera.
              const topo = atrasado ? "bg-red-800" : alerta ? "bg-amber-700" : "bg-zinc-800";

              return (
                <article
                  key={pedido.id}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-zinc-900 ${
                    isNovo ? "border-yellow-400/70" : "border-zinc-800"
                  }`}
                >
                  <header className={`flex items-center justify-between px-4 py-3 ${topo}`}>
                    <p className="text-3xl font-extrabold tracking-tight">#{pedido.numero}</p>
                    <p className="font-mono text-2xl font-bold tabular-nums">{minutos} min</p>
                  </header>

                  <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        // Só a etiqueta pisca: piscar o card inteiro apagava o texto
                        isNovo ? "animate-pulse-slow bg-yellow-400 text-zinc-900" : "bg-blue-600 text-white"
                      }`}
                    >
                      {isNovo ? "Novo" : "Em preparo"}
                    </span>
                    <span className={`flex items-center gap-1 rounded px-2 py-0.5 ${retirada ? "bg-sky-900 text-sky-200" : "bg-zinc-800 text-zinc-300"}`}>
                      {retirada ? <Store size={14} /> : <Bike size={14} />}
                      {retirada ? "Retirada" : "Entrega"}
                    </span>
                    <span className="ml-auto text-zinc-400">
                      {posicao === 0 ? "Próximo" : `${posicao + 1}º da fila`}
                    </span>
                  </div>

                  <ul className="flex-1 space-y-3 px-4 py-3">
                    {pedido.itens.map((item) => (
                      <li key={item.id} className="flex gap-3 text-xl">
                        <span className="min-w-[2.5rem] font-mono font-bold text-orange-400">{item.quantidade}×</span>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">
                            {item.nomeProdutoSnapshot}
                            {item.nomeVarianteSnapshot && (
                              <span className="font-normal text-zinc-400"> · {item.nomeVarianteSnapshot}</span>
                            )}
                          </p>
                          {item.personalizacoes && (
                            <div className="mt-1 space-y-0.5 text-base">
                              {item.personalizacoes.removidos.length > 0 && (
                                <p className="font-semibold text-red-400">
                                  Sem {item.personalizacoes.removidos.join(", ")}
                                </p>
                              )}
                              {item.personalizacoes.adicionados.length > 0 && (
                                <p className="font-semibold text-green-400">
                                  + {item.personalizacoes.adicionados.map((a) => a.nome).join(", ")}
                                </p>
                              )}
                              {item.personalizacoes.observacao && (
                                <p className="font-semibold text-yellow-300">
                                  Obs.: {item.personalizacoes.observacao}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {pedido.obs && (
                    <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-yellow-500/15 px-3 py-2">
                      <MessageSquareWarning size={18} className="mt-0.5 shrink-0 text-yellow-300" />
                      <p className="text-base font-semibold text-yellow-200">{pedido.obs}</p>
                    </div>
                  )}

                  <div className="p-4 pt-1">
                    <button
                      onClick={() => avancar(pedido)}
                      disabled={acting === pedido.id}
                      className={`flex h-14 w-full items-center justify-center gap-2 rounded-lg text-xl font-bold transition-colors disabled:opacity-60 ${
                        aguardandoConfirmacao
                          ? "bg-white text-zinc-900 ring-4 ring-green-400"
                          : isNovo
                            ? "bg-yellow-400 text-zinc-900 hover:bg-yellow-300"
                            : "bg-green-500 text-zinc-950 hover:bg-green-400"
                      }`}
                    >
                      {acting === pedido.id ? (
                        "..."
                      ) : isNovo ? (
                        <>
                          <ChefHat size={22} /> Iniciar preparo
                        </>
                      ) : aguardandoConfirmacao ? (
                        <>Toque de novo para confirmar</>
                      ) : retirada ? (
                        <>
                          <Bell size={22} /> Pronto para retirada
                        </>
                      ) : (
                        <>
                          <Bike size={22} /> Pronto · saiu para entrega
                        </>
                      )}
                    </button>
                  </div>
                </article>
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
