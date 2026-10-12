"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  Check,
  ChefHat,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api, mensagemErroApi } from "@/lib/api";
import {
  contatoDoPedido,
  formatBRL,
  formatTelefone,
  horaCurta,
  linkWhatsApp,
  tempoDesde,
  tipoPagamentoLabel,
} from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { EnderecoSnapshot, Pedido } from "@/types";

interface MinhasEntregas {
  entregador: { id: string; nome: string; ativo: boolean } | null;
  pedidos: Pedido[];
}

const ATUALIZAR_A_CADA_MS = 20_000;

function enderecoEmLinha(e: EnderecoSnapshot): string {
  return [
    `${e.logradouro}, ${e.numero}`,
    e.complemento,
    e.bairro,
    `${e.cidade}/${e.uf}`,
  ]
    .filter(Boolean)
    .join(" - ");
}

function linkMapa(e: EnderecoSnapshot): string {
  const q = `${e.logradouro}, ${e.numero} - ${e.bairro}, ${e.cidade} - ${e.uf}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function CardEntrega({
  pedido,
  onEntregue,
}: {
  pedido: Pedido;
  onEntregue?: (p: Pedido) => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const contato = contatoDoPedido(pedido);
  const end = pedido.enderecoEntregaSnapshot;
  const troco = pedido.trocoPara
    ? Number(pedido.trocoPara) - Number(pedido.total)
    : 0;

  // O segundo toque confirma; sem ele, o botão volta ao normal sozinho
  useEffect(() => {
    if (!confirmando) return;
    const t = setTimeout(() => setConfirmando(false), 4000);
    return () => clearTimeout(t);
  }, [confirmando]);

  const tocarEntregue = async () => {
    if (!onEntregue) return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setEnviando(true);
    try {
      await onEntregue(pedido);
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  };

  return (
    <article className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-bold">#{String(pedido.numero).padStart(3, "0")}</h3>
        <span className="text-sm text-zinc-400">
          {pedido.entrega?.saiuEm
            ? `saiu ${tempoDesde(pedido.entrega.saiuEm)}`
            : `pedido às ${horaCurta(pedido.criadoEm)}`}
        </span>
      </div>

      <p className="text-lg font-semibold">{contato.nome}</p>

      {end && (
        <a
          href={linkMapa(end)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-start gap-2 rounded-lg bg-zinc-900 p-3 text-zinc-100 active:bg-zinc-950"
        >
          <MapPin size={20} className="mt-0.5 shrink-0 text-primary-400" />
          <span className="text-base leading-snug">{enderecoEmLinha(end)}</span>
        </a>
      )}

      <div className="mt-3 rounded-lg bg-zinc-900 p-3">
        <p className="text-base">
          <span className="text-zinc-400">Cobrar:</span>{" "}
          <strong className="text-xl">{formatBRL(pedido.total)}</strong>{" "}
          <span className="text-zinc-300">({tipoPagamentoLabel(pedido.pagamento)})</span>
        </p>
        {troco > 0 && (
          <p className="mt-1 text-base text-amber-300">
            Paga com {formatBRL(pedido.trocoPara!)} · levar {formatBRL(troco)} de troco
          </p>
        )}
      </div>

      {pedido.obs && (
        <p className="mt-3 rounded-lg bg-yellow-900/40 p-3 text-sm text-yellow-100">
          {pedido.obs}
        </p>
      )}

      <p className="mt-3 text-sm text-zinc-400">
        {pedido.itens
          .map((i) => `${i.quantidade}x ${i.nomeProdutoSnapshot}`)
          .join(", ")}
      </p>

      {contato.telefone && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={`tel:${contato.telefone.replace(/\D/g, "")}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 py-3 text-sm font-medium active:bg-zinc-600"
          >
            <Phone size={18} />
            {formatTelefone(contato.telefone)}
          </a>
          <a
            href={linkWhatsApp(contato.telefone)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-green-700 py-3 text-sm font-medium active:bg-green-600"
          >
            <MessageCircle size={18} />
            WhatsApp
          </a>
        </div>
      )}

      {onEntregue && (
        <button
          type="button"
          onClick={tocarEntregue}
          disabled={enviando}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-bold transition-colors disabled:opacity-60 ${
            confirmando
              ? "bg-amber-500 text-zinc-950"
              : "bg-primary-500 text-white active:bg-primary-600"
          }`}
        >
          <Check size={22} />
          {confirmando ? "Toque de novo para confirmar" : "Entregue"}
        </button>
      )}
    </article>
  );
}

function EntregaPageContent() {
  const logout = useAuthStore((s) => s.logout);
  const funcionario = useAuthStore((s) => s.funcionario);
  const showToast = useToastStore((s) => s.show);
  const [dados, setDados] = useState<MinhasEntregas | null>(null);
  const [erro, setErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const { data } = await api.get<MinhasEntregas>("/entregador/entregas");
      setDados(data);
      setErro(false);
    } catch {
      setErro(true);
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, ATUALIZAR_A_CADA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  const marcarEntregue = async (pedido: Pedido) => {
    try {
      await api.patch(`/entregador/entregas/${pedido.id}/entregue`);
      showToast(`Pedido #${pedido.numero} entregue`, "success");
      await carregar();
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível marcar como entregue"), "error");
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const pedidos = dados?.pedidos ?? [];
  const emRota = pedidos.filter((p) => p.status === "SAIU_ENTREGA");
  const naCozinha = pedidos.filter(
    (p) => p.status === "NOVO" || p.status === "PREPARANDO"
  );
  const entregues = pedidos.filter((p) => p.status === "ENTREGUE");

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700 bg-zinc-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <Bike size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Entregas</h1>
            {funcionario && (
              <p className="text-xs text-zinc-400">{funcionario.nome}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregar}
            className="rounded-lg bg-zinc-800 p-2 text-white hover:bg-zinc-700"
            aria-label="Atualizar"
          >
            <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-4 py-4">
        {erro && (
          <p className="rounded-lg bg-red-900/50 p-3 text-sm text-red-100">
            Sem conexão com o sistema. Tentando de novo a cada 20 segundos.
          </p>
        )}

        {dados && !dados.entregador && (
          <div className="rounded-xl border border-amber-700 bg-amber-900/30 p-4 text-amber-100">
            <p className="font-semibold">Seu login ainda não está ligado a um entregador.</p>
            <p className="mt-1 text-sm">
              Peça ao administrador: Entregadores → editar o seu cadastro → em
              &quot;Acesso à tela de entregas&quot;, escolher este login.
            </p>
          </div>
        )}

        {dados?.entregador && (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Em rota ({emRota.length})
              </h2>
              {emRota.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-400">
                  Nenhuma entrega com você agora.
                </p>
              ) : (
                <div className="space-y-3">
                  {emRota.map((p) => (
                    <CardEntrega key={p.id} pedido={p} onEntregue={marcarEntregue} />
                  ))}
                </div>
              )}
            </section>

            {naCozinha.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  <ChefHat size={16} />
                  Sendo preparados para você ({naCozinha.length})
                </h2>
                <div className="space-y-3 opacity-80">
                  {naCozinha.map((p) => (
                    <CardEntrega key={p.id} pedido={p} />
                  ))}
                </div>
              </section>
            )}

            {entregues.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Entregues hoje ({entregues.length})
                </h2>
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                  {entregues.map((p) => (
                    <li key={p.id} className="flex justify-between px-4 py-2 text-sm">
                      <span>
                        #{String(p.numero).padStart(3, "0")} · {contatoDoPedido(p).nome}
                      </span>
                      <span className="text-zinc-400">
                        {p.entrega?.entregueEm ? horaCurta(p.entrega.entregueEm) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function EntregaPage() {
  return (
    <ProtectedRoute allowedProfiles={["ENTREGADOR"]}>
      <EntregaPageContent />
    </ProtectedRoute>
  );
}
