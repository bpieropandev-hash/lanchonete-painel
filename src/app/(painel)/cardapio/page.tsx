"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Image as ImageIcon } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AcoesLinha, StatusBadge } from "@/components/ui/LinhaAcoes";
import { ProdutoModal } from "@/components/cardapio/ProdutoModal";
import { ExcluirProdutoModal } from "@/components/cardapio/ExcluirProdutoModal";
import { CategoriaModal } from "@/components/cardapio/CategoriaModal";
import { IngredienteModal } from "@/components/cardapio/IngredienteModal";
import { api } from "@/lib/api";
import { formatBRL, resolveImageUrl } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Categoria, Ingrediente, Produto } from "@/types";

type Tab = "produtos" | "categorias" | "ingredientes";

const TAB_LABEL: Record<Tab, string> = {
  produtos: "Produtos",
  categorias: "Categorias",
  ingredientes: "Ingredientes",
};

function FotoProduto({
  produto,
  className,
}: {
  produto: Produto;
  className: string;
}) {
  return produto.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveImageUrl(produto.fotoUrl) ?? ""}
      alt={produto.nome}
      className={`${className} shrink-0 rounded object-cover`}
    />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded bg-gray-200 text-gray-400`}
    >
      <ImageIcon size={16} />
    </div>
  );
}

function CardapioContent() {
  const [tab, setTab] = useState<Tab>("produtos");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoEdit, setProdutoEdit] = useState<Produto | null>(null);
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null);
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
      showToast("Não foi possível carregar o cardápio.", "error");
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
      showToast("Não foi possível alterar o produto.", "error");
    }
  };

  const toggleCategoriaAtiva = async (c: Categoria) => {
    try {
      await api.patch(`/admin/cardapio/categorias/${c.id}/toggle-ativo`);
      setCategorias((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Não foi possível alterar a categoria.", "error");
    }
  };

  const toggleIngredienteAtivo = async (i: Ingrediente) => {
    try {
      await api.patch(`/admin/cardapio/ingredientes/${i.id}/toggle-ativo`);
      setIngredientes((prev) =>
        prev.map((x) => (x.id === i.id ? { ...x, ativo: !x.ativo } : x))
      );
    } catch {
      showToast("Não foi possível alterar o ingrediente.", "error");
    }
  };

  const editarProduto = (p: Produto) => {
    setProdutoEdit(p);
    setProdutoOpen(true);
  };

  const editarCategoria = (c: Categoria) => {
    setCategoriaEdit(c);
    setCategoriaOpen(true);
  };

  const editarIngrediente = (i: Ingrediente) => {
    setIngredienteEdit(i);
    setIngredienteOpen(true);
  };

  return (
    <>
      <div
        role="tablist"
        className="scrollbar-hide mb-4 flex overflow-x-auto border-b border-gray-200"
      >
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t
                ? "border-primary-500 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {TAB_LABEL[t]}
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
                <div className="mb-3 flex sm:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setProdutoEdit(null);
                      setProdutoOpen(true);
                    }}
                  >
                    Novo produto
                  </Button>
                </div>
              )}

              {produtos.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-400 shadow-sm">
                  Nenhum produto cadastrado
                </div>
              )}

              {/* Celular: um cartão por produto */}
              {produtos.length > 0 && (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
                  {produtos.map((p) => (
                    <li key={p.id} className="p-3">
                      <div className="flex gap-3">
                        <FotoProduto produto={p} className="h-14 w-14" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-gray-900">
                            {p.nome}
                          </p>
                          {p.categoria?.nome && (
                            <p className="text-xs text-gray-500">{p.categoria.nome}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatBRL(p.precoBase)}
                            </span>
                            <StatusBadge
                              ativo={p.disponivel}
                              rotuloAtivo="Disponível"
                              rotuloInativo="Indisponível"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AcoesLinha
                          rotulos
                          ativo={p.disponivel}
                          onEditar={isAdmin ? () => editarProduto(p) : undefined}
                          onToggle={() => toggleProdutoDisponivel(p)}
                          onExcluir={isAdmin ? () => setProdutoExcluir(p) : undefined}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Tablet/desktop: tabela */}
              {produtos.length > 0 && (
                <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Foto</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Preço</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {produtos.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <FotoProduto produto={p} className="h-10 w-10" />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {p.nome}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {p.categoria?.nome || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                            {formatBRL(p.precoBase)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              ativo={p.disponivel}
                              rotuloAtivo="Disponível"
                              rotuloInativo="Indisponível"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <AcoesLinha
                                ativo={p.disponivel}
                                onEditar={isAdmin ? () => editarProduto(p) : undefined}
                                onToggle={() => toggleProdutoDisponivel(p)}
                                onExcluir={isAdmin ? () => setProdutoExcluir(p) : undefined}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "categorias" && (
            <div>
              {isAdmin && (
                <div className="mb-3 flex sm:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setCategoriaEdit(null);
                      setCategoriaOpen(true);
                    }}
                  >
                    Nova categoria
                  </Button>
                </div>
              )}

              {categorias.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-400 shadow-sm">
                  Nenhuma categoria cadastrada
                </div>
              )}

              {categorias.length > 0 && (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
                  {categorias.map((c) => (
                    <li key={c.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-gray-900">{c.nome}</p>
                          <p className="text-xs text-gray-500">Ordem {c.ordem}</p>
                        </div>
                        <StatusBadge
                          ativo={c.ativo}
                          rotuloAtivo="Ativa"
                          rotuloInativo="Inativa"
                        />
                      </div>
                      {isAdmin && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AcoesLinha
                            rotulos
                            ativo={c.ativo}
                            onEditar={() => editarCategoria(c)}
                            onToggle={() => toggleCategoriaAtiva(c)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {categorias.length > 0 && (
                <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
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
                      {categorias.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {c.nome}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.ordem}</td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              ativo={c.ativo}
                              rotuloAtivo="Ativa"
                              rotuloInativo="Inativa"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <AcoesLinha
                                  ativo={c.ativo}
                                  onEditar={() => editarCategoria(c)}
                                  onToggle={() => toggleCategoriaAtiva(c)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "ingredientes" && (
            <div>
              {isAdmin && (
                <div className="mb-3 flex sm:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    leftIcon={<Plus size={16} />}
                    onClick={() => {
                      setIngredienteEdit(null);
                      setIngredienteOpen(true);
                    }}
                  >
                    Novo ingrediente
                  </Button>
                </div>
              )}

              {ingredientes.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-400 shadow-sm">
                  Nenhum ingrediente cadastrado
                </div>
              )}

              {ingredientes.length > 0 && (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
                  {ingredientes.map((i) => (
                    <li key={i.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-medium text-gray-900">{i.nome}</p>
                          <p className="text-xs text-gray-500">
                            Adicional {formatBRL(i.precoAdicional)} ·{" "}
                            {i.removivel ? "Removível" : "Não removível"}
                          </p>
                        </div>
                        <StatusBadge
                          ativo={i.ativo}
                          rotuloAtivo="Ativo"
                          rotuloInativo="Inativo"
                        />
                      </div>
                      {isAdmin && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AcoesLinha
                            rotulos
                            ativo={i.ativo}
                            onEditar={() => editarIngrediente(i)}
                            onToggle={() => toggleIngredienteAtivo(i)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {ingredientes.length > 0 && (
                <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Preço adicional</th>
                        <th className="px-3 py-2">Removível</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ingredientes.map((i) => (
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
                            <StatusBadge
                              ativo={i.ativo}
                              rotuloAtivo="Ativo"
                              rotuloInativo="Inativo"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <AcoesLinha
                                  ativo={i.ativo}
                                  onEditar={() => editarIngrediente(i)}
                                  onToggle={() => toggleIngredienteAtivo(i)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
      <ExcluirProdutoModal
        produto={produtoExcluir}
        onClose={() => setProdutoExcluir(null)}
        onDeleted={(id) => setProdutos((prev) => prev.filter((x) => x.id !== id))}
        onRefresh={loadAll}
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
