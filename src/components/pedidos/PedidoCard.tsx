"use client";

import { Clock, MapPin, User as UserIcon, CreditCard } from "lucide-react";
import type { Pedido } from "@/types";
import { formatBRL, tempoDesde, tipoPagamentoLabel } from "@/lib/format";

interface PedidoCardProps {
  pedido: Pedido;
  onClick: () => void;
}

export function PedidoCard({ pedido, onClick }: PedidoCardProps) {
  const total = parseFloat(pedido.total);
  const itensCount = pedido.itens?.reduce((sum, i) => sum + i.quantidade, 0) || 0;
  const endereco = pedido.enderecoEntregaSnapshot;

  return (
    <button
      onClick={onClick}
      className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-gray-900">#{pedido.numero}</p>
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            {tempoDesde(pedido.criadoEm)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary-600">{formatBRL(total)}</p>
          <p className="text-xs text-gray-500">
            {itensCount} {itensCount === 1 ? "item" : "itens"}
          </p>
        </div>
      </div>

      {pedido.cliente && (
        <p className="mb-1 flex items-center gap-1 truncate text-xs text-gray-700">
          <UserIcon size={12} />
          {pedido.cliente.nome}
        </p>
      )}

      {endereco && (
        <p className="mb-1 flex items-start gap-1 text-xs text-gray-600">
          <MapPin size={12} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">
            {endereco.logradouro}, {endereco.numero} - {endereco.bairro}
          </span>
        </p>
      )}

      <p className="flex items-center gap-1 text-xs text-gray-600">
        <CreditCard size={12} />
        {tipoPagamentoLabel(pedido.pagamento)}
      </p>
    </button>
  );
}
