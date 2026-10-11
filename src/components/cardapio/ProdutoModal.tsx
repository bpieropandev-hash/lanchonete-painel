"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { produtoSchema, type ProdutoInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Categoria, Ingrediente, Produto } from "@/types";

type VarianteRow = {
  key: string;
  id?: string;
  nome: string;
  preco: string;
  disponivel: boolean;
  ordem: number;
};

function genKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

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
  const [uploading, setUploading] = useState(false);
  const [selectedIngredientes, setSelectedIngredientes] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [variantes, setVariantes] = useState<VarianteRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProdutoInput>({
    resolver: zodResolver(produtoSchema),
  });

  const fotoUrlValue = watch("fotoUrl");

  const categoriaIdSelecionada = watch("categoriaId");
  const categoriaSelecionada = categorias.find(
    (c) => c.id === categoriaIdSelecionada,
  );
  const isBebida = categoriaSelecionada?.tipo === "BEBIDA";

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
      // A API devolve os vínculos em produtoIngredientes (antes lia-se um campo
      // inexistente e salvar o produto apagava todos os ingredientes).
      const vinculos = produto?.produtoIngredientes ?? [];
      setSelectedIngredientes(
        vinculos.filter((pi) => pi.padrao).map((pi) => pi.ingredienteId)
      );
      setSelectedExtras(
        vinculos.filter((pi) => !pi.padrao).map((pi) => pi.ingredienteId)
      );
      setVariantes(
        (produto?.variantes ?? [])
          .slice()
          .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
          .map((v) => ({
            key: v.id,
            id: v.id,
            nome: v.nome,
            preco: parseFloat(v.preco).toFixed(2),
            disponivel: v.disponivel,
            ordem: v.ordem,
          }))
      );
    }
  }, [open, produto, categorias, reset]);

  const toggleIngrediente = (id: string) => {
    setSelectedIngredientes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const addVariante = () => {
    setVariantes((prev) => [
      ...prev,
      {
        key: genKey(),
        nome: "",
        preco: "",
        disponivel: true,
        ordem: prev.length,
      },
    ]);
  };

  const updateVariante = (key: string, patch: Partial<VarianteRow>) => {
    setVariantes((prev) =>
      prev.map((v) => (v.key === key ? { ...v, ...patch } : v))
    );
  };

  const removeVariante = (key: string) => {
    setVariantes((prev) => prev.filter((v) => v.key !== key));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<{ url: string }>(
        "/admin/uploads/foto",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setValue("fotoUrl", data.url, { shouldValidate: true });
      showToast("Foto enviada", "success");
    } catch {
      showToast("Erro ao enviar foto", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ProdutoInput) => {
    // Valida variantes antes de enviar
    for (const v of variantes) {
      if (!v.nome.trim()) {
        showToast("Preencha o nome de todas as variantes", "error");
        return;
      }
      const preco = parseFloat(v.preco);
      if (isNaN(preco) || preco < 0) {
        showToast(`Preço inválido na variante "${v.nome}"`, "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...data,
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
        ingredientesIds: isBebida ? [] : selectedIngredientes,
        ingredientesExtrasIds: isBebida ? [] : selectedExtras,
      });
      await api.patch(`/admin/cardapio/produtos/${savedId}/variantes`, {
        variantes: variantes.map((v, idx) => ({
          ...(v.id && { id: v.id }),
          nome: v.nome.trim(),
          preco: parseFloat(v.preco),
          disponivel: v.disponivel,
          ordem: idx,
        })),
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
          {...register("descricao")}
          error={errors.descricao?.message}
        />

        {/* Foto */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Foto do produto
          </p>
          <div className="flex items-start gap-3">
            {/* Thumbnail / placeholder */}
            <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {fotoUrlValue ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(fotoUrlValue) ?? ""}
                    alt="Prévia"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setValue("fotoUrl", "")}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <ImagePlus className="h-7 w-7 text-gray-300" />
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                disabled={uploading}
              >
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Enviando…" : "Fazer upload"}
              </Button>
              <input
                type="text"
                placeholder="ou cole uma URL (https://…)"
                {...register("fotoUrl")}
                className="h-8 rounded-lg border border-gray-300 px-2 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              {errors.fotoUrl && (
                <p className="text-xs text-red-600">
                  {errors.fotoUrl.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {isBebida ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500">
            Bebidas não exibem a seção de ingredientes. Para customizações
            (sabores), use a seção Variantes abaixo.
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700">
              Vem no lanche ({selectedIngredientes.length})
            </p>
            <p className="mb-2 text-xs text-gray-500">
              O cliente pode tirar os que estiverem marcados como removíveis.
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
                    className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${selected
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

            <p className="mt-4 text-sm font-medium text-gray-700">
              Adicionais pagos ({selectedExtras.length})
            </p>
            <p className="mb-2 text-xs text-gray-500">
              O cliente pode adicionar pagando o preço adicional do ingrediente.
            </p>
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
              {ingredientes.map((ing) => {
                const selected = selectedExtras.includes(ing.id);
                const semPreco = parseFloat(ing.precoAdicional) <= 0;
                return (
                  <button
                    type="button"
                    key={ing.id}
                    onClick={() => toggleExtra(ing.id)}
                    title={semPreco ? "Ingrediente sem preço adicional: sairá de graça" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${selected
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <span className="font-medium">{ing.nome}</span>
                    <span className={`ml-2 text-xs ${semPreco ? "text-amber-600" : "text-gray-500"}`}>
                      {semPreco ? "grátis" : `+R$ ${parseFloat(ing.precoAdicional).toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Variantes / Sabores ({variantes.length})
              </p>
              <p className="text-xs text-gray-500">
                Ex: Suco → Laranja, Uva, Maracujá. Cliente escolhe 1.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addVariante}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {variantes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
              Produto sem variantes. O preço base será usado.
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-2">
              {variantes.map((v) => (
                <div
                  key={v.key}
                  className="grid grid-cols-12 items-center gap-2"
                >
                  <input
                    type="text"
                    value={v.nome}
                    onChange={(e) =>
                      updateVariante(v.key, { nome: e.target.value })
                    }
                    placeholder="Nome (ex: Laranja)"
                    className="col-span-6 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.preco}
                    onChange={(e) =>
                      updateVariante(v.key, { preco: e.target.value })
                    }
                    placeholder="Preço"
                    className="col-span-3 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <label className="col-span-2 flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={v.disponivel}
                      onChange={(e) =>
                        updateVariante(v.key, {
                          disponivel: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                    />
                    Disponível
                  </label>
                  <button
                    type="button"
                    onClick={() => removeVariante(v.key)}
                    className="col-span-1 flex h-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover variante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
