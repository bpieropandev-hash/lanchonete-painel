"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { produtoSchema, type ProdutoInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Categoria, Ingrediente, Produto } from "@/types";

interface ProdutoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  produto: Produto | null;
  categorias: Categoria[];
  ingredientes: Ingrediente[];
}

export function ProdutoModal({
  open,
  onClose,
  onSaved,
  produto,
  categorias,
  ingredientes,
}: ProdutoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [selectedIngredientes, setSelectedIngredientes] = useState<string[]>([]);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProdutoInput>({
    resolver: zodResolver(produtoSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: produto?.nome || "",
        descricao: produto?.descricao || "",
        precoBase: produto ? parseFloat(produto.precoBase) : 0,
        fotoUrl: produto?.fotoUrl || "",
        categoriaId: produto?.categoriaId || categorias[0]?.id || "",
        ordem: produto?.ordem || 0,
      });
      setDescricao(produto?.descricao || "");
      setSelectedIngredientes(produto?.ingredientes?.map((i) => i.id) || []);
    }
  }, [open, produto, categorias, reset]);

  const toggleIngrediente = (id: string) => {
    setSelectedIngredientes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: ProdutoInput) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        descricao,
        fotoUrl: data.fotoUrl || undefined,
      };
      let savedId: string;
      if (produto) {
        const { data: updated } = await api.patch<Produto>(
          `/admin/cardapio/produtos/${produto.id}`,
          payload
        );
        savedId = updated.id;
      } else {
        const { data: created } = await api.post<Produto>(
          "/admin/cardapio/produtos",
          payload
        );
        savedId = created.id;
      }
      await api.patch(`/admin/cardapio/produtos/${savedId}/ingredientes`, {
        ingredientesIds: selectedIngredientes,
      });
      showToast(produto ? "Produto atualizado" : "Produto criado", "success");
      onSaved();
      onClose();
    } catch {
      showToast("Erro ao salvar produto", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={produto ? "Editar Produto" : "Novo Produto"}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
          >
            Salvar
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nome"
            {...register("nome")}
            error={errors.nome?.message}
          />
          <Select
            label="Categoria"
            {...register("categoriaId")}
            error={errors.categoriaId?.message}
          >
            {categorias.length === 0 && <option value="">—</option>}
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
          <Input
            label="Preço base (R$)"
            type="number"
            step="0.01"
            {...register("precoBase", { valueAsNumber: true })}
            error={errors.precoBase?.message}
          />
          <Input
            label="Ordem"
            type="number"
            {...register("ordem", { valueAsNumber: true })}
            error={errors.ordem?.message}
          />
        </div>

        <Textarea
          label="Descrição"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          error={errors.descricao?.message}
        />
        <input type="hidden" {...register("descricao")} value={descricao} />

        <Input
          label="URL da foto"
          placeholder="https://..."
          {...register("fotoUrl")}
          error={errors.fotoUrl?.message}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Ingredientes ({selectedIngredientes.length} selecionados)
          </p>
          <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
            {ingredientes.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs text-gray-400">
                Cadastre ingredientes na aba correspondente.
              </p>
            )}
            {ingredientes.map((ing) => {
              const selected = selectedIngredientes.includes(ing.id);
              return (
                <button
                  type="button"
                  key={ing.id}
                  onClick={() => toggleIngrediente(ing.id)}
                  className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary-500 bg-primary-50 text-primary-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{ing.nome}</span>
                  {parseFloat(ing.precoAdicional) > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      +R$ {parseFloat(ing.precoAdicional).toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
