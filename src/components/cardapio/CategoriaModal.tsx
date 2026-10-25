"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { categoriaSchema, type CategoriaInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Categoria } from "@/types";

interface CategoriaModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoria: Categoria | null;
}

export function CategoriaModal({
  open,
  onClose,
  onSaved,
  categoria,
}: CategoriaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: "", ordem: 0, tipo: "LANCHE" },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: categoria?.nome || "",
        ordem: categoria?.ordem || 0,
        tipo: categoria?.tipo || "LANCHE",
      });
    }
  }, [open, categoria, reset]);

  const onSubmit = async (data: CategoriaInput) => {
    setSubmitting(true);
    try {
      if (categoria) {
        await api.patch(`/admin/cardapio/categorias/${categoria.id}`, data);
        showToast("Categoria atualizada", "success");
      } else {
        await api.post("/admin/cardapio/categorias", data);
        showToast("Categoria criada", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast("Não foi possível salvar a categoria.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={categoria ? "Editar categoria" : "Nova categoria"}
      size="sm"
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
        <Input
          label="Nome"
          {...register("nome")}
          error={errors.nome?.message}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            {...register("tipo")}
            error={errors.tipo?.message}
          >
            <option value="LANCHE">Lanche</option>
            <option value="BEBIDA">Bebida</option>
            <option value="OUTRO">Outro</option>
          </Select>
          <Input
            label="Ordem"
            type="number"
            {...register("ordem", { valueAsNumber: true })}
            error={errors.ordem?.message}
          />
        </div>
        <p className="text-xs text-gray-500">
          Bebidas não exibem a seção de ingredientes na personalização.
        </p>
      </form>
    </Modal>
  );
}
