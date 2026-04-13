"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Power, Image as ImageIcon } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProdutoModal } from "@/components/cardapio/ProdutoModal";
import { CategoriaModal } from "@/components/cardapio/CategoriaModal";
import { IngredienteModal } from "@/components/cardapio/IngredienteModal";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Categoria, Ingrediente, Produto } from "@/types";

type Tab = "produtos" | "categorias" | "ingredientes";

function CardapioContent() {
  const [tab, setTab] = useState<Tab>("produtos");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoEdit, setProdutoEdit] = useState<Produto | null>(null);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [categoriaEdit, setCategoriaEdit] = useState<Categoria | null>(null);
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [ingredienteEdit, setIngredienteEdit] = useState<Ingrediente | null>(null);
  const [ingredienteOpen, setIngredienteOpen] = useState(false);

  const { funcionario } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const isAdmin = funcionario?.perfil === "ADMIN";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats, ings] = await Promise.all([
        api.get("/admin/cardapio/produtos"),
        api.get("/admin/cardapio/categorias"),
        api.get("/admin/cardapio/ingredientes"),
      ]);
      const toArr = (d: unknown) => (Array.isArray(d) ? d : []);
      setProdutos(toArr(prods.data));
      setCategorias(toArr(cats.data));
      setIngredientes(toArr(ings.data));
    } catch {
      showToast("Erro ao carregar cardápio", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleProdutoDisponivel = async (p: Produto) => {
    try {
      await api.patch(`/admin/cardapio/produtos/${p.id}/toggle-disponivel`);
      setProdutos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, disponivel: !x.disponivel } : x))
      );
    } catch {
      showToast("Erro ao alterar produto", "error");
    }
  };

  const toggleCategoriaAtiva = async (c: Categoria) => {
    try {
      await api.patch(`/admin/cardapio/categorias/${c.id}/toggle-ativo`);
      setCategorias((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Erro ao alterar categoria", "error");
    }
  };

  const toggleIngredienteAtivo = async (i: Ingrediente) => {
    try {
      await api.patch(`/admin/cardapio/ingredientes/${i.id}/toggle-ativo`);
      setIngredientes((prev) =>
        prev.map((x) => (x.id === i.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Erro ao alterar ingrediente", "error");
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200">
        {(["produtos", "categorias", "ingredientes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {tab === "produtos" && (
            <div>
              {isAdmin && (
                <div className="mb-3 flex justify-end">
                  <Button
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setProdutoEdit(null);
                      setProdutoOpen(true);
                    }}
                  >
                    Novo Produto
                  </Button>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Foto</th>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2 hidden md:table-cell">Categoria</th>
                      <th className="px-3 py-2">Preço</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produtos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                          Nenhum produto cadastrado
                        </td>
                      </tr>
                    ) : (
                      produtos.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            {p.fotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.fotoUrl}
                                alt={p.nome}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-gray-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {p.nome}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-gray-600">
                            {p.categoria?.nome || "-"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-primary-600">
                            {formatBRL(p.precoBase)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.disponivel
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {p.disponivel ? "Disponível" : "Indisponível"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setProdutoEdit(p);
                                    setProdutoOpen(true);
                                  }}
                                  className="rounded p-1 text-gray-600 hover:bg-gray-100"
                                  aria-label="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => toggleProdutoDisponivel(p)}
                                className={`rounded p-1 ${
                                  p.disponivel
                                    ? "text-green-600 hover:bg-green-50"
                                    : "text-gray-400 hover:bg-gray-100"
                                }`}
                                aria-label="Toggle"
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
            </div>
          )}

          {tab === "categorias" && (
            <div>
              {isAdmin && (
                <div className="mb-3 flex justify-end">
                  <Button
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setCategoriaEdit(null);
                      setCategoriaOpen(true);
                    }}
                  >
                    Nova Categoria
                  </Button>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Ordem</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categorias.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                          Nenhuma categoria cadastrada
                        </td>
                      </tr>
                    ) : (
                      categorias.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {c.nome}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.ordem}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                c.ativo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {c.ativo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setCategoriaEdit(c);
                                    setCategoriaOpen(true);
                                  }}
                                  className="rounded p-1 text-gray-600 hover:bg-gray-100"
                                  aria-label="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => toggleCategoriaAtiva(c)}
                                  className={`rounded p-1 ${
                                    c.ativo
                                      ? "text-green-600 hover:bg-green-50"
                                      : "text-gray-400 hover:bg-gray-100"
                                  }`}
                                  aria-label="Toggle"
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
            </div>
          )}

          {tab === "ingredientes" && (
            <div>
              {isAdmin && (
                <div className="mb-3 flex justify-end">
                  <Button
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setIngredienteEdit(null);
                      setIngredienteOpen(true);
                    }}
                  >
                    Novo Ingrediente
                  </Button>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Preço Adicional</th>
                      <th className="px-3 py-2">Removível</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ingredientes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                          Nenhum ingrediente cadastrado
                        </td>
                      </tr>
                    ) : (
                      ingredientes.map((i) => (
                        <tr key={i.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {i.nome}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {formatBRL(i.precoAdicional)}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {i.removivel ? "Sim" : "Não"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                i.ativo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {i.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setIngredienteEdit(i);
                                    setIngredienteOpen(true);
                                  }}
                                  className="rounded p-1 text-gray-600 hover:bg-gray-100"
                                  aria-label="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => toggleIngredienteAtivo(i)}
                                  className={`rounded p-1 ${
                                    i.ativo
                                      ? "text-green-600 hover:bg-green-50"
                                      : "text-gray-400 hover:bg-gray-100"
                                  }`}
                                  aria-label="Toggle"
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
            </div>
          )}
        </>
      )}

      <ProdutoModal
        open={produtoOpen}
        onClose={() => setProdutoOpen(false)}
        onSaved={loadAll}
        produto={produtoEdit}
        categorias={categorias}
        ingredientes={ingredientes.filter((i) => i.ativo)}
      />
      <CategoriaModal
        open={categoriaOpen}
        onClose={() => setCategoriaOpen(false)}
        onSaved={loadAll}
        categoria={categoriaEdit}
      />
      <IngredienteModal
        open={ingredienteOpen}
        onClose={() => setIngredienteOpen(false)}
        onSaved={loadAll}
        ingrediente={ingredienteEdit}
      />
    </>
  );
}

export default function CardapioPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Cardápio">
        <CardapioContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
