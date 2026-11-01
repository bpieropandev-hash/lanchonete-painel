"use client";

import { useState } from "react";
import axios from "axios";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api, mensagemErroApi } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Produto } from "@/types";

interface ExcluirProdutoModalProps {
  /** Produto a excluir; `null` mantém o modal fechado. */
  produto: Produto | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
  /** Recarrega a lista quando o servidor não reconhece o produto (404). */
  onRefresh: () => void;
}

export function ExcluirProdutoModal({
  produto,
  onClose,
  onDeleted,
  onRefresh,
}: ExcluirProdutoModalProps) {
  const [loading, setLoading] = useState(false);
  const showToast = useToastStore((s) => s.show);

  // Enquanto a requisição está em andamento, Esc e clique fora não fecham.
  const fechar = () => {
    if (!loading) onClose();
  };

  const excluir = async () => {
    if (!produto || loading) return;
    setLoading(true);
    try {
      await api.delete(`/admin/cardapio/produtos/${produto.id}`);
      showToast(`"${produto.nome}" foi excluído.`, "success");
      onDeleted(produto.id);
      onClose();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 404) {
        // Pode ter sido excluído em outro lugar, mas também pode ser a rota
        // ainda não existir na API: não removemos nada localmente, só
        // recarregamos a lista para mostrar o que o servidor realmente tem.
        showToast("Produto não encontrado. A lista foi atualizada.", "info");
        onRefresh();
        onClose();
      } else {
        showToast(mensagemErroApi(err, "Não foi possível excluir o produto."), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={produto !== null}
      onClose={fechar}
      title="Excluir produto"
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={fechar} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={excluir} loading={loading}>
            Excluir
          </Button>
        </div>
      }
    >
      <p className="text-sm text-gray-700">
        Tem certeza que deseja excluir{" "}
        <strong className="break-words text-gray-900">{produto?.nome}</strong>? Ele sai
        do cardápio e do site.
      </p>
      <p className="mt-3 text-sm text-gray-500">
        Pedidos antigos que incluem esse produto continuam no histórico.
      </p>
    </Modal>
  );
}
