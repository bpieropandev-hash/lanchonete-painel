"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { PedidoDetalheModal } from "@/components/pedidos/PedidoDetalheModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { contatoDoPedido, formatBRL, formatDataHora, statusLabel } from "@/lib/format";
import type { ListaPedidos, Pedido, StatusPedido, TipoEntrega } from "@/types";

const LIMITE = 20;

const STATUS: StatusPedido[] = [
  "AGUARDANDO_CONFIRMACAO",
  "NOVO",
  "PREPARANDO",
  "PRONTO",
  "SAIU_ENTREGA",
  "ENTREGUE",
  "CANCELADO",
];

interface Filtros {
  busca: string;
  status: "" | StatusPedido;
  tipoEntrega: "" | TipoEntrega;
  dataInicio: string;
  dataFim: string;
}

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  status: "",
  tipoEntrega: "",
  dataInicio: "",
  dataFim: "",
};

function corStatus(status: StatusPedido): string {
  if (status === "ENTREGUE") return "bg-green-100 text-green-800";
  if (status === "CANCELADO") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function HistoricoContent() {
  const [form, setForm] = useState<Filtros>(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get<ListaPedidos>("/admin/pedidos", {
        params: {
          busca: filtros.busca || undefined,
          status: filtros.status || undefined,
          tipoEntrega: filtros.tipoEntrega || undefined,
          dataInicio: filtros.dataInicio || undefined,
          dataFim: filtros.dataFim || undefined,
          pagina,
          limite: LIMITE,
        },
      });
      setPedidos(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPaginas(Math.max(1, data.totalPaginas ?? 1));
    } catch {
      setErro("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    load();
  }, [load]);

  const aplicar = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.dataInicio && form.dataFim && form.dataInicio > form.dataFim) {
      setErro("A data inicial não pode ser depois da data final.");
      return;
    }
    setPagina(1);
    setFiltros({ ...form, busca: form.busca.trim() });
  };

  const limpar = () => {
    setForm(FILTROS_VAZIOS);
    setFiltros(FILTROS_VAZIOS);
    setPagina(1);
  };

  const removerDaLista = (id: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const atualizarNaLista = (atualizado: Pedido) =>
    setPedidos((prev) => prev.map((p) => (p.id === atualizado.id ? { ...p, ...atualizado } : p)));

  return (
    <div className="mx-auto max-w-6xl">
      <form
        onSubmit={aplicar}
        className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm grid-cols-2 lg:grid-cols-5"
      >
        <div className="col-span-2 lg:col-span-2">
          <Input
            label="Buscar"
            name="busca"
            placeholder="Nº do pedido, nome ou telefone"
            value={form.busca}
            onChange={(e) => setForm({ ...form, busca: e.target.value })}
            maxLength={100}
          />
        </div>
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as Filtros["status"] })}
        >
          <option value="">Todos</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Select
          label="Tipo"
          name="tipoEntrega"
          value={form.tipoEntrega}
          onChange={(e) => setForm({ ...form, tipoEntrega: e.target.value as Filtros["tipoEntrega"] })}
        >
          <option value="">Todos</option>
          <option value="ENTREGA">Entrega</option>
          <option value="RETIRADA">Retirada</option>
        </Select>
        <div className="hidden lg:block" />
        <Input
          label="De"
          name="dataInicio"
          type="date"
          value={form.dataInicio}
          onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
        />
        <Input
          label="Até"
          name="dataFim"
          type="date"
          value={form.dataFim}
          onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
        />
        <div className="flex items-end gap-2 col-span-2 lg:col-span-3 lg:justify-end">
          <Button type="button" variant="ghost" onClick={limpar}>
            Limpar
          </Button>
          <Button type="submit" leftIcon={<Search size={16} />}>
            Filtrar
          </Button>
        </div>
      </form>

      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{erro}</span>
          <Button size="sm" variant="secondary" onClick={load}>
            Tentar de novo
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-500">
            {total} {total === 1 ? "pedido" : "pedidos"}
          </p>

          {/* Celular: um cartão por pedido */}
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {pedidos.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">Nenhum pedido encontrado</li>
            )}
            {pedidos.map((p) => {
              const contato = contatoDoPedido(p);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className="block w-full p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">
                        #{String(p.numero).padStart(3, "0")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-gray-700">{contato.nome}</p>
                    <p className="text-xs text-gray-500">
                      {formatDataHora(p.criadoEm)} · {p.tipoEntrega === "ENTREGA" ? "Entrega" : "Retirada"} ·{" "}
                      {formatBRL(p.total)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: tabela */}
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum pedido encontrado
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(p.id);
                          }}
                          className="hover:underline focus-visible:underline"
                        >
                          #{String(p.numero).padStart(3, "0")}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDataHora(p.criadoEm)}</td>
                      <td className="px-4 py-3 text-gray-700">{contatoDoPedido(p).nome}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.tipoEntrega === "ENTREGA" ? "Entrega" : "Retirada"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corStatus(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">
                        {formatBRL(p.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      <PedidoDetalheModal
        open={!!selectedId}
        pedidoId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={atualizarNaLista}
        onDeleted={removerDaLista}
      />
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Histórico de pedidos">
        <HistoricoContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
