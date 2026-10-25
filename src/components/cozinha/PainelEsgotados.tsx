"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Produto } from "@/types";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

/**
 * Lista do cardápio para a cozinha marcar o que acabou. Marcado como
 * esgotado, o item some do site na hora; tocar de novo devolve.
 */
export function PainelEsgotados({ aberto, onFechar }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [alterando, setAlterando] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<Produto[]>("/admin/cardapio/produtos");
      setProdutos(Array.isArray(data) ? data : []);
    } catch {
      showToast("Não foi possível carregar o cardápio.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  const alternarProduto = async (p: Produto) => {
    setAlterando(p.id);
    try {
      await api.patch(`/admin/cardapio/produtos/${p.id}/toggle-disponivel`);
      setProdutos((lista) =>
        lista.map((x) => (x.id === p.id ? { ...x, disponivel: !x.disponivel } : x))
      );
      showToast(p.disponivel ? `${p.nome}: esgotado` : `${p.nome}: voltou`, "success");
    } catch {
      showToast("Não foi possível alterar", "error");
    } finally {
      setAlterando(null);
    }
  };

  const alternarVariante = async (p: Produto, varianteId: string) => {
    setAlterando(varianteId);
    try {
      await api.patch(
        `/admin/cardapio/produtos/${p.id}/variantes/${varianteId}/toggle-disponivel`
      );
      setProdutos((lista) =>
        lista.map((x) =>
          x.id === p.id
            ? {
                ...x,
                variantes: (x.variantes ?? []).map((v) =>
                  v.id === varianteId ? { ...v, disponivel: !v.disponivel } : v
                ),
              }
            : x
        )
      );
    } catch {
      showToast("Não foi possível alterar", "error");
    } finally {
      setAlterando(null);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="Itens esgotados">
      <div className="flex h-full w-full max-w-xl flex-col bg-zinc-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-2xl font-bold">Acabou algo?</h2>
            <p className="text-sm text-zinc-400">Toque para marcar como esgotado. Some do site na hora.</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-lg bg-zinc-800 p-3 hover:bg-zinc-700"
          >
            <X size={22} />
          </button>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {produtos.map((p) => (
            <li key={p.id} className="rounded-xl border border-zinc-800 p-3">
              <button
                type="button"
                disabled={alterando === p.id}
                onClick={() => alternarProduto(p)}
                aria-pressed={!p.disponivel}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-4 text-left text-lg font-bold disabled:opacity-60 ${
                  p.disponivel ? "bg-zinc-800 hover:bg-zinc-700" : "bg-red-700 hover:bg-red-600"
                }`}
              >
                <span>{p.nome}</span>
                <span className="text-sm font-semibold">{p.disponivel ? "Disponível" : "ESGOTADO"}</span>
              </button>
              {(p.variantes ?? []).length > 0 && p.disponivel && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(p.variantes ?? []).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={alterando === v.id}
                      onClick={() => alternarVariante(p, v.id)}
                      aria-pressed={!v.disponivel}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                        v.disponivel ? "bg-zinc-800 hover:bg-zinc-700" : "bg-red-700 line-through"
                      }`}
                    >
                      {v.nome}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
