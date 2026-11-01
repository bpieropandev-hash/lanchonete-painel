"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Power, Phone, Smartphone } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AcoesLinha, StatusBadge } from "@/components/ui/LinhaAcoes";
import { EntregadorModal } from "@/components/entregadores/EntregadorModal";
import { api } from "@/lib/api";
import { formatTelefone } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Entregador } from "@/types";

function EntregadoresContent() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Entregador | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { funcionario } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const isAdmin = funcionario?.perfil === "ADMIN";

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/entregadores");
      setEntregadores(Array.isArray(data) ? data : []);
    } catch {
      showToast("Não foi possível carregar os entregadores.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAtivo = async (e: Entregador) => {
    try {
      await api.patch(`/admin/entregadores/${e.id}/toggle-ativo`);
      setEntregadores((prev) =>
        prev.map((x) => (x.id === e.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Não foi possível alterar o entregador.", "error");
    }
  };

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            Novo entregador
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
        {/* Celular: um cartão por entregador */}
        {entregadores.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm md:hidden">
            Nenhum entregador cadastrado
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {entregadores.map((e) => (
              <li key={e.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">{e.nome}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone size={14} className="shrink-0" />
                      {formatTelefone(e.telefone)}
                    </p>
                    {e.usuarioId ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                        <Smartphone size={14} className="shrink-0" />
                        Tela de entregas
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-amber-700">Sem login vinculado</p>
                    )}
                  </div>
                  <StatusBadge ativo={e.ativo} rotuloAtivo="Ativo" rotuloInativo="Inativo" />
                </div>
                {isAdmin && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AcoesLinha
                      rotulos
                      ativo={e.ativo}
                      onEditar={() => {
                        setEditItem(e);
                        setModalOpen(true);
                      }}
                      onToggle={() => toggleAtivo(e)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Tablet/desktop: tabela */}
        <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Acesso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entregadores.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Nenhum entregador cadastrado
                  </td>
                </tr>
              ) : (
                entregadores.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {e.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone size={14} />
                        {formatTelefone(e.telefone)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.usuarioId ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Smartphone size={14} />
                          Tela de entregas
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Sem login vinculado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {e.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditItem(e);
                              setModalOpen(true);
                            }}
                            className="rounded p-1 text-gray-600 hover:bg-gray-100"
                            aria-label="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => toggleAtivo(e)}
                            className={`rounded p-1 ${
                              e.ativo
                                ? "text-green-600 hover:bg-green-50"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                            aria-label="Toggle ativo"
                          >
                            <Power size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      <EntregadorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        entregador={editItem}
      />
    </>
  );
}

export default function EntregadoresPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Entregadores">
        <EntregadoresContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
