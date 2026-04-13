"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Power, Phone } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
      showToast("Erro ao carregar entregadores", "error");
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
      showToast("Erro ao alterar entregador", "error");
    }
  };

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            Novo Entregador
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entregadores.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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
