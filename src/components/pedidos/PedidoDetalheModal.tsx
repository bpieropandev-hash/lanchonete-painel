"use client";

import { useEffect, useState } from "react";
import { ChefHat, Bike, Check, X as XIcon, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { api } from "@/lib/api";
import {
  formatBRL,
  formatDataHora,
  statusLabel,
  tipoPagamentoLabel,
} from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Pedido, StatusPedido } from "@/types";
import axios from "axios";

interface PedidoDetalheModalProps {
  open: boolean;
  pedidoId: string | null;
  onClose: () => void;
  onUpdated: (pedido: Pedido) => void;
}

const nextStatus: Partial<Record<StatusPedido, { status: StatusPedido; label: string; icon: typeof ChefHat }>> = {
  NOVO: { status: "PREPARANDO", label: "Iniciar Preparo", icon: ChefHat },
  PREPARANDO: { status: "SAIU_ENTREGA", label: "Saiu para Entrega", icon: Bike },
  SAIU_ENTREGA: { status: "ENTREGUE", label: "Marcar como Entregue", icon: Check },
};

export function PedidoDetalheModal({
  open,
  pedidoId,
  onClose,
  onUpdated,
}: PedidoDetalheModalProps) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!open || !pedidoId) {
      setPedido(null);
      setShowCancel(false);
      setMotivoCancelamento("");
      return;
    }
    setLoading(true);
    api
      .get<Pedido>(`/admin/pedidos/${pedidoId}`)
      .then((res) => setPedido(res.data))
      .catch(() => showToast("Erro ao carregar pedido", "error"))
      .finally(() => setLoading(false));
  }, [open, pedidoId, showToast]);

  const handleAvancar = async () => {
    if (!pedido) return;
    const next = nextStatus[pedido.status];
    if (!next) return;
    setActing(true);
    try {
      const { data } = await api.patch<Pedido>(
        `/admin/pedidos/${pedido.id}/status`,
        { status: next.status }
      );
      showToast(`Pedido marcado como ${statusLabel(next.status)}`, "success");
      onUpdated(data);
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
      }
      onClose();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data
          ? (err.response.data as { message?: string }).message ||
            "Erro ao atualizar status"
          : "Erro ao atualizar status";
      showToast(msg, "error");
    } finally {
      setActing(false);
    }
  };

  const handleCancelar = async () => {
    if (!pedido) return;
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
      showToast("Pedido cancelado", "success");
      onUpdated(data);
      onClose();
    } catch {
      showToast("Erro ao cancelar pedido", "error");
    } finally {
      setActing(false);
    }
  };

  const action = pedido ? nextStatus[pedido.status] : null;
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
      {loading || !pedido ? (
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
            </div>
          )}

          {pedido.cliente && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Cliente
              </p>
              <p className="font-medium text-gray-900">{pedido.cliente.nome}</p>
              <p className="text-gray-600">{pedido.cliente.telefone}</p>
            </div>
          )}

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

          {pedido.entregador && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Entregador
              </p>
              <p className="text-gray-900">{pedido.entregador.nome}</p>
            </div>
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
