"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Entregador, Pedido, StatusPedido } from "@/types";

/** Status em que ainda dá para escolher ou trocar o entregador. */
const PODE_ESCOLHER: StatusPedido[] = ["NOVO", "PREPARANDO", "SAIU_ENTREGA"];

interface EntregadorDoPedidoProps {
  pedido: Pedido;
  onAlterado: () => void;
}

export function EntregadorDoPedido({ pedido, onAlterado }: EntregadorDoPedidoProps) {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [salvando, setSalvando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const atual = pedido.entrega?.entregador ?? null;
  const editavel = PODE_ESCOLHER.includes(pedido.status);

  useEffect(() => {
    if (!editavel) return;
    api
      .get<Entregador[]>("/admin/entregadores", { params: { apenasAtivos: true } })
      .then(({ data }) => setEntregadores(Array.isArray(data) ? data : []))
      .catch(() => setEntregadores([]));
  }, [editavel]);

  const atribuir = async (entregadorId: string) => {
    setSalvando(true);
    try {
      await api.post(`/admin/entregas/${pedido.id}/atribuir`, {
        entregadorId: entregadorId || undefined,
      });
      showToast(entregadorId ? "Entregador definido" : "Entregador removido", "success");
      onAlterado();
    } catch (err) {
      showToast(mensagemErroApi(err, "Erro ao definir entregador"), "error");
    } finally {
      setSalvando(false);
    }
  };

  if (!editavel) {
    if (!atual) return null;
    return (
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Entregador</p>
        <p className="text-gray-900">{atual.nome}</p>
      </div>
    );
  }

  // O entregador atual pode ter sido desativado depois de atribuído
  const opcoes =
    atual && !entregadores.some((e) => e.id === atual.id)
      ? [atual, ...entregadores]
      : entregadores;

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Entregador</p>
      {opcoes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum entregador ativo. Cadastre em Entregadores.
        </p>
      ) : (
        <Select
          aria-label="Entregador"
          value={atual?.id ?? ""}
          disabled={salvando}
          onChange={(e) => atribuir(e.target.value)}
        >
          <option value="">Sem entregador</option>
          {opcoes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
              {e.entregasAtivas ? ` (${e.entregasAtivas} em rota)` : ""}
              {e.usuarioId ? "" : " - sem login"}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
