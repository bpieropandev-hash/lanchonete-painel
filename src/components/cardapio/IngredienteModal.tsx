"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ingredienteSchema, type IngredienteInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Ingrediente } from "@/types";

interface IngredienteModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ingrediente: Ingrediente | null;
}

export function IngredienteModal({
  open,
  onClose,
  onSaved,
  ingrediente,
}: IngredienteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IngredienteInput>({
    resolver: zodResolver(ingredienteSchema),
    defaultValues: { nome: "", precoAdicional: 0, removivel: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: ingrediente?.nome || "",
        precoAdicional: ingrediente
          ? parseFloat(ingrediente.precoAdicional)
          : 0,
        removivel: ingrediente?.removivel ?? true,
      });
    }
  }, [open, ingrediente, reset]);

  const onSubmit = async (data: IngredienteInput) => {
    setSubmitting(true);
    try {
      if (ingrediente) {
        await api.patch(`/admin/cardapio/ingredientes/${ingrediente.id}`, data);
        showToast("Ingrediente atualizado", "success");
      } else {
        await api.post("/admin/cardapio/ingredientes", data);
        showToast("Ingrediente criado", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast("Não foi possível salvar o ingrediente.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ingrediente ? "Editar ingrediente" : "Novo ingrediente"}
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
        <Input
          label="Preço adicional (R$)"
          type="number"
          step="0.01"
          {...register("precoAdicional", { valueAsNumber: true })}
          error={errors.precoAdicional?.message}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            {...register("removivel")}
          />
          Removível pelo cliente
        </label>
      </form>
    </Modal>
  );
}
