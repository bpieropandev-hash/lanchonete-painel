"use client";

import type { Pedido } from "@/types";
import { contatoDoPedido, formatBRL, formatHora, tipoPagamentoLabel } from "@/lib/format";

interface PedidoCardProps {
  pedido: Pedido;
  /** Minutos desde a criação, calculados pela tela para todos os cards juntos. */
  minutos: number;
  onClick: () => void;
}

/**
 * Prazo de cada etapa: depois de "atencao" minutos o tempo fica amarelo,
 * depois de "atraso" fica vermelho. Mesmos limites da tela da cozinha.
 */
const PRAZOS: Partial<Record<Pedido["status"], { atencao: number; atraso: number; acao?: string }>> = {
  AGUARDANDO_CONFIRMACAO: { atencao: 10, atraso: 20 },
  NOVO: { atencao: 5, atraso: 10, acao: "aceitar" },
  PREPARANDO: { atencao: 15, atraso: 25, acao: "atrasado" },
};

function duracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, "0")}`;
}

function etiquetaTempo(pedido: Pedido, minutos: number) {
  // Concluído: o tempo corrido não interessa mais, mostra a hora do pedido.
  if (pedido.status === "ENTREGUE") return { texto: formatHora(pedido.criadoEm), classe: "bg-gray-100 text-gray-500" };
  const prazo = PRAZOS[pedido.status];
  const texto = duracao(minutos);
  if (!prazo || minutos < prazo.atencao) return { texto, classe: "bg-gray-100 text-gray-600" };
  const comAcao = prazo.acao ? `${texto} · ${prazo.acao}` : texto;
  if (minutos < prazo.atraso) return { texto: comAcao, classe: "bg-amber-100 text-amber-800" };
  return { texto: comAcao, classe: "bg-red-100 text-red-800" };
}

export function PedidoCard({ pedido, minutos, onClick }: PedidoCardProps) {
  const endereco = pedido.enderecoEntregaSnapshot;
  const tempo = etiquetaTempo(pedido, minutos);
  const resumo = (pedido.itens ?? [])
    .map((i) => `${i.quantidade}× ${i.nomeProdutoSnapshot}`)
    .join(", ");
  const concluido = pedido.status === "ENTREGUE";

  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-lg border border-gray-200 bg-white p-3 text-left text-sm shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-colors hover:border-gray-300 ${
        concluido ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">#{pedido.numero}</span>
        {pedido.status === "AGUARDANDO_CONFIRMACAO" && pedido.codigoConfirmacao && (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 font-mono text-xs font-medium text-emerald-700">
            {pedido.codigoConfirmacao}
          </span>
        )}
        <span className={`ml-auto whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${tempo.classe}`}>
          {tempo.texto}
        </span>
      </div>

      <p className="mt-1 truncate font-medium text-gray-800">
        {contatoDoPedido(pedido).nome}
      </p>
      {resumo && <p className="mt-0.5 truncate text-gray-500">{resumo}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-dashed border-gray-200 pt-2 text-xs">
        {pedido.tipoEntrega === "RETIRADA" ? (
          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">Retirada</span>
        ) : (
          endereco && (
            <span className="max-w-[8rem] truncate rounded border border-gray-200 px-1.5 py-0.5 text-gray-600" title={`${endereco.logradouro}, ${endereco.numero}`}>
              {endereco.bairro}
            </span>
          )
        )}
        <span className="whitespace-nowrap rounded border border-gray-200 px-1.5 py-0.5 text-gray-600">
          {tipoPagamentoLabel(pedido.pagamento)}
          {pedido.pagamento === "DINHEIRO" && pedido.trocoPara && <> · troco p/ {formatBRL(pedido.trocoPara)}</>}
        </span>
        <span className="ml-auto whitespace-nowrap text-sm font-semibold text-gray-900">
          {formatBRL(parseFloat(pedido.total))}
        </span>
      </div>
    </button>
  );
}
