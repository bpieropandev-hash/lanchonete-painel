"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Search } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AcaoBotao } from "@/components/ui/LinhaAcoes";
import { ResetSenhaModal } from "@/components/clientes/ResetSenhaModal";
import { api } from "@/lib/api";
import { formatBRL, formatTelefone } from "@/lib/format";
import type { ClienteAdmin, ListaClientes } from "@/types";

const LIMITE = 20;

function ClientesContent() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resetCliente, setResetCliente] = useState<ClienteAdmin | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get<ListaClientes>("/admin/clientes", {
        params: { busca: termo || undefined, pagina, limite: LIMITE },
      });
      setClientes(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPaginas(Math.max(1, data.totalPaginas ?? 1));
    } catch {
      setErro("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }, [termo, pagina]);

  useEffect(() => {
    load();
  }, [load]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    setTermo(busca.trim());
  };

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={buscar} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:max-w-sm sm:flex-1">
          <Input
            label="Buscar cliente"
            name="busca"
            placeholder="Nome, telefone ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={100}
          />
        </div>
        <Button type="submit" variant="secondary" leftIcon={<Search size={16} />}>
          Buscar
        </Button>
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
            {total} {total === 1 ? "cliente" : "clientes"}
          </p>

          {/* Celular: um cartão por cliente */}
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {clientes.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">Nenhum cliente encontrado</li>
            )}
            {clientes.map((c) => (
              <li key={c.id} className="p-3">
                <p className="break-words font-medium text-gray-900">{c.nome}</p>
                <p className="text-sm text-gray-600">{formatTelefone(c.telefone)}</p>
                {c.email && <p className="break-all text-sm text-gray-600">{c.email}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {c.totalPedidos} {c.totalPedidos === 1 ? "pedido" : "pedidos"} · cashback{" "}
                  {c.cashback === null ? "—" : formatBRL(c.cashback)}
                </p>
                <div className="mt-3">
                  <AcaoBotao
                    rotulo
                    icone={<KeyRound size={16} />}
                    nome="Resetar senha"
                    onClick={() => setResetCliente(c)}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet/desktop: tabela */}
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3 text-right">Cashback</th>
                  <th className="px-4 py-3 text-right">Pedidos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatTelefone(c.telefone)}
                      </td>
                      <td className="break-all px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {c.cashback === null ? "—" : formatBRL(c.cashback)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.totalPedidos}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <AcaoBotao
                            icone={<KeyRound size={16} />}
                            nome="Resetar senha"
                            onClick={() => setResetCliente(c)}
                          />
                        </div>
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

      <ResetSenhaModal cliente={resetCliente} onClose={() => setResetCliente(null)} />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Clientes">
        <ClientesContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
