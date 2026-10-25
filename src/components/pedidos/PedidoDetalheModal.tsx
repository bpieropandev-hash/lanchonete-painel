"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChefHat,
  Bike,
  Check,
  X as XIcon,
  ExternalLink,
  Store,
  Bell,
  MessageCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EntregadorDoPedido } from "@/components/pedidos/EntregadorDoPedido";
import { api } from "@/lib/api";
import {
  contatoDoPedido,
  formatBRL,
  formatDataHora,
  formatTelefone,
  linkWhatsApp,
  statusLabel,
  tipoPagamentoLabel,
} from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido, TipoEntrega } from "@/types";
import axios from "axios";

interface PedidoDetalheModalProps {
  open: boolean;
  pedidoId: string | null;
  onClose: () => void;
  onUpdated: (pedido: Pedido) => void;
}

type Acao = { status: StatusPedido; label: string; icon: typeof ChefHat };

const PROXIMO_STATUS: Record<TipoEntrega, Partial<Record<StatusPedido, Acao>>> = {
  ENTREGA: {
    AGUARDANDO_CONFIRMACAO: { status: "NOVO", label: "Confirmar (WhatsApp recebido)", icon: MessageCircle },
    NOVO: { status: "PREPARANDO", label: "Iniciar preparo", icon: ChefHat },
    PREPARANDO: { status: "SAIU_ENTREGA", label: "Saiu para entrega", icon: Bike },
    SAIU_ENTREGA: { status: "ENTREGUE", label: "Marcar como entregue", icon: Check },
  },
  RETIRADA: {
    AGUARDANDO_CONFIRMACAO: { status: "NOVO", label: "Confirmar (WhatsApp recebido)", icon: MessageCircle },
    NOVO: { status: "PREPARANDO", label: "Iniciar preparo", icon: ChefHat },
    PREPARANDO: { status: "PRONTO", label: "Pronto para retirada", icon: Bell },
    PRONTO: { status: "ENTREGUE", label: "Cliente retirou", icon: Check },
  },
};

const proximaAcao = (pedido: Pedido): Acao | undefined =>
  PROXIMO_STATUS[pedido.tipoEntrega ?? "ENTREGA"][pedido.status];

function mensagemErro(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}

export function PedidoDetalheModal(props: PedidoDetalheModalProps) {
  return <PedidoDetalheContent key={`${props.open}:${props.pedidoId}`} {...props} />;
}

function PedidoDetalheContent({
  open,
  pedidoId,
  onClose,
  onUpdated,
}: PedidoDetalheModalProps) {
  const alive = useRef(false);
  const sequence = useRef(0);
  const [erro, setErro] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    const counter = sequence;
    alive.current = true;
    return () => { alive.current = false; counter.current++; };
  }, []);

  useEffect(() => {
    if (!open || !pedidoId) {
      setPedido(null);
      setShowCancel(false);
      setMotivoCancelamento("");
      return;
    }
    const own = ++sequence.current;
    setLoading(true);
    setErro(false);
    api
      .get<Pedido>(`/admin/pedidos/${pedidoId}`)
      .then((res) => { if (alive.current && own === sequence.current && res.data.id === pedidoId) setPedido(res.data); })
      .catch(() => { if (alive.current && own === sequence.current) { setErro(true); showToast("Não foi possível carregar o pedido.", "error"); } })
      .finally(() => { if (alive.current && own === sequence.current) setLoading(false); });
  }, [open, pedidoId, showToast]);

  const recarregar = () => {
    if (!pedidoId || !alive.current) return;
    const own = ++sequence.current;
    api
      .get<Pedido>(`/admin/pedidos/${pedidoId}`)
      .then((res) => {
        if (!alive.current || own !== sequence.current || res.data.id !== pedidoId) return;
        setPedido(res.data);
        onUpdated(res.data);
      })
      .catch(() => { if (alive.current && own === sequence.current) showToast("Não foi possível carregar o pedido.", "error"); });
  };

  const handleAvancar = async () => {
    if (!open || !alive.current || acting || !pedido || pedido.id !== pedidoId) return;
    const next = proximaAcao(pedido);
    if (!next) return;
    setActing(true);
    try {
      const { data } = await api.patch<Pedido>(
        `/admin/pedidos/${pedido.id}/status`,
        { status: next.status }
      );
      if (!alive.current || data.id !== pedidoId) return;
      showToast(`Pedido marcado como ${statusLabel(next.status)}`, "success");
      onUpdated(data);
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
      }
      onClose();
    } catch (err) {
      if (!alive.current) return;
      showToast(mensagemErro(err, "Não foi possível mudar o status."), "error");
    } finally {
      if (alive.current) setActing(false);
    }
  };

  const handleCancelar = async () => {
    if (!open || !alive.current || acting || !pedido || pedido.id !== pedidoId) return;
    if (!motivoCancelamento.trim()) {
      showToast("Informe o motivo do cancelamento", "error");
      return;
    }
    setActing(true);
    try {
      const { data } = await api.patch<Pedido>(
        `/admin/pedidos/${pedido.id}/status`,
        { status: "CANCELADO", motivoCancelamento }
      );
      if (!alive.current || data.id !== pedidoId) return;
      showToast("Pedido cancelado", "success");
      onUpdated(data);
      onClose();
    } catch (err) {
      if (!alive.current) return;
      showToast(mensagemErro(err, "Não foi possível cancelar o pedido."), "error");
    } finally {
      if (alive.current) setActing(false);
    }
  };

  const action = pedido ? proximaAcao(pedido) : null;
  const ActionIcon = action?.icon;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pedido ? `Pedido #${pedido.numero}` : "Carregando..."}
      size="lg"
      footer={
        pedido && pedido.status !== "ENTREGUE" && pedido.status !== "CANCELADO" ? (
          showCancel ? (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Motivo do cancelamento..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCancel(false)}
                  disabled={acting}
                >
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelar}
                  loading={acting}
                  fullWidth
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="danger"
                onClick={() => setShowCancel(true)}
                disabled={acting}
                leftIcon={<XIcon size={16} />}
              >
                Cancelar Pedido
              </Button>
              {action && ActionIcon && (
                <Button
                  variant="primary"
                  onClick={handleAvancar}
                  loading={acting}
                  fullWidth
                  leftIcon={<ActionIcon size={16} />}
                >
                  {action.label}
                </Button>
              )}
            </div>
          )
        ) : null
      }
    >
      {erro ? (
        <p role="alert" className="mx-auto max-w-md py-8 text-center text-sm">Erro ao carregar pedido. Feche e tente novamente.</p>
      ) : loading || !pedido ? (
        <p className="py-8 text-center text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">
                {statusLabel(pedido.status)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Criado em</p>
              <p className="text-gray-900">{formatDataHora(pedido.criadoEm)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Pagamento</p>
              <p className="text-gray-900">
                {tipoPagamentoLabel(pedido.pagamento)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="font-bold text-primary-600">
                {formatBRL(pedido.total)}
              </p>
            </div>
          </div>

          {pedido.pagamento === "DINHEIRO" && (
            <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
              <strong>Pagamento em dinheiro</strong>
              {pedido.trocoPara ? (
                <>
                  {" "}· cliente paga com {formatBRL(pedido.trocoPara)} →{" "}
                  <strong>
                    levar {formatBRL(Number(pedido.trocoPara) - Number(pedido.total))} de troco
                  </strong>
                </>
              ) : (
                " · sem troco"
              )}
            </div>
          )}

          {pedido.status === "AGUARDANDO_CONFIRMACAO" && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <p className="font-semibold">Aguardando confirmação pelo WhatsApp</p>
              <p className="mt-1">
                Confirme só se chegou mensagem do número{" "}
                <strong>{formatTelefone(contatoDoPedido(pedido).telefone)}</strong> com o código{" "}
                <strong className="font-mono text-base tracking-widest">
                  {pedido.codigoConfirmacao}
                </strong>
                .
              </p>
              <p className="mt-1 text-xs">
                Cancelado automaticamente se não confirmado em 30 min.
              </p>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
              Cliente {!pedido.clienteId && "(sem cadastro)"}
            </p>
            <p className="font-medium text-gray-900">{contatoDoPedido(pedido).nome}</p>
            {contatoDoPedido(pedido).telefone && (
              <a
                href={linkWhatsApp(contatoDoPedido(pedido).telefone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-green-700 hover:underline"
              >
                <MessageCircle size={14} />
                {formatTelefone(contatoDoPedido(pedido).telefone)}
              </a>
            )}
          </div>

          {pedido.tipoEntrega === "RETIRADA" || !pedido.enderecoEntregaSnapshot ? (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-900">
              <Store size={16} />
              Retirada no balcão
            </div>
          ) : (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Endereço de entrega
              </p>
              <p className="text-gray-700">
                {pedido.enderecoEntregaSnapshot.logradouro},{" "}
                {pedido.enderecoEntregaSnapshot.numero}
                {pedido.enderecoEntregaSnapshot.complemento &&
                  ` - ${pedido.enderecoEntregaSnapshot.complemento}`}
              </p>
              <p className="text-gray-700">
                {pedido.enderecoEntregaSnapshot.bairro},{" "}
                {pedido.enderecoEntregaSnapshot.cidade}/{pedido.enderecoEntregaSnapshot.uf}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              Itens ({pedido.itens.length})
            </p>
            <div className="space-y-2">
              {pedido.itens.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-2"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900">
                      {item.quantidade}x {item.nomeProdutoSnapshot}
                      {item.nomeVarianteSnapshot && (
                        <span className="text-gray-600">
                          {" "}
                          — {item.nomeVarianteSnapshot}
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {formatBRL(item.subtotal)}
                    </p>
                  </div>
                  {item.personalizacoes && (
                    <div className="mt-1 space-y-0.5 text-xs">
                      {item.personalizacoes.removidos.length > 0 && (
                        <p className="text-red-600">
                          Sem: {item.personalizacoes.removidos.join(", ")}
                        </p>
                      )}
                      {item.personalizacoes.adicionados.length > 0 && (
                        <p className="text-green-700">
                          Adicionar:{" "}
                          {item.personalizacoes.adicionados
                            .map((a) => `${a.nome} (+${formatBRL(a.preco)})`)
                            .join(", ")}
                        </p>
                      )}
                      {item.personalizacoes.observacao && (
                        <p className="italic text-gray-700">
                          Obs.: {item.personalizacoes.observacao}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {pedido.obs && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Observação
              </p>
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-yellow-900">
                {pedido.obs}
              </p>
            </div>
          )}

          {pedido.tipoEntrega !== "RETIRADA" && (
            <EntregadorDoPedido pedido={pedido} onAlterado={recarregar} />
          )}

          {pedido.motivoCancelamento && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong>Cancelado:</strong> {pedido.motivoCancelamento}
            </div>
          )}

          {pedido.whatsappLink && (
            <a
              href={pedido.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              <ExternalLink size={14} />
              Abrir conversa no WhatsApp
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
