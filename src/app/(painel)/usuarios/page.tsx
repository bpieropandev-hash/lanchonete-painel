"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Power, KeyRound } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AcaoBotao, StatusBadge } from "@/components/ui/LinhaAcoes";
import { UsuarioModal } from "@/components/usuarios/UsuarioModal";
import { SenhaModal } from "@/components/usuarios/SenhaModal";
import { api } from "@/lib/api";
import { perfilLabel, formatDataHora } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import type { Usuario } from "@/types";

function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Usuario | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [senhaItem, setSenhaItem] = useState<Usuario | null>(null);
  const showToast = useToastStore((s) => s.show);
  const meuId = useAuthStore((s) => s.funcionario?.id);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/usuarios");
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      showToast("Não foi possível carregar os usuários.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAtivo = async (u: Usuario) => {
    try {
      await api.patch(`/usuarios/${u.id}/toggle-ativo`);
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Não foi possível alterar o usuário.", "error");
    }
  };

  return (
    <>
      <div className="mb-4 flex sm:justify-end">
        <Button
          className="w-full sm:w-auto"
          leftIcon={<Plus size={16} />}
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
        >
          Novo usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
        {/* Celular: um cartão por usuário */}
        {usuarios.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm md:hidden">
            Nenhum usuário cadastrado
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {usuarios.map((u) => (
              <li key={u.id} className="p-3">
                <p className="break-words font-medium text-gray-900">{u.nome}</p>
                <p className="break-all text-sm text-gray-600">{u.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {perfilLabel(u.perfil)}
                  </span>
                  <StatusBadge ativo={u.ativo} rotuloAtivo="Ativo" rotuloInativo="Inativo" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AcaoBotao
                    rotulo
                    icone={<Edit size={16} />}
                    nome="Editar"
                    onClick={() => {
                      setEditItem(u);
                      setModalOpen(true);
                    }}
                  />
                  <AcaoBotao
                    rotulo
                    icone={<KeyRound size={16} />}
                    nome="Alterar senha"
                    onClick={() => setSenhaItem(u)}
                  />
                  <AcaoBotao
                    rotulo
                    icone={<Power size={16} />}
                    nome={u.ativo ? "Desativar" : "Ativar"}
                    onClick={() => toggleAtivo(u)}
                    tom={u.ativo ? "ligado" : "desligado"}
                  />
                </div>
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
                <th className="px-4 py-3 hidden sm:table-cell">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3 hidden md:table-cell">Criado em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.nome}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {perfilLabel(u.perfil)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                      {formatDataHora(u.criadoEm)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditItem(u);
                            setModalOpen(true);
                          }}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          aria-label="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setSenhaItem(u)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          aria-label="Alterar senha"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => toggleAtivo(u)}
                          className={`rounded p-1 ${
                            u.ativo
                              ? "text-green-600 hover:bg-green-50"
                              : "text-gray-400 hover:bg-gray-100"
                          }`}
                          aria-label="Toggle ativo"
                        >
                          <Power size={16} />
                        </button>
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

      <UsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        usuario={editItem}
      />
      <SenhaModal
        open={!!senhaItem}
        onClose={() => setSenhaItem(null)}
        modo={senhaItem?.id === meuId ? "propria" : "redefinir"}
        usuarioId={senhaItem?.id || null}
        usuarioNome={senhaItem?.nome || ""}
      />
    </>
  );
}

export default function UsuariosPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN"]}>
      <PainelShell title="Usuários">
        <UsuariosContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
