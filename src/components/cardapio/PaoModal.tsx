"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { paoSchema, type PaoInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Pao } from "@/types";

interface PaoModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  pao: Pao | null;
}

export function PaoModal({ open, onClose, onSaved, pao }: PaoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaoInput>({
    resolver: zodResolver(paoSchema),
    defaultValues: { nome: "", precoAdicional: 0, ordem: 0 },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: pao?.nome || "",
        precoAdicional: pao ? parseFloat(pao.precoAdicional) : 0,
        ordem: pao?.ordem ?? 0,
      });
    }
  }, [open, pao, reset]);

  const onSubmit = async (data: PaoInput) => {
    setSubmitting(true);
    try {
      if (pao) {
        await api.patch(`/admin/cardapio/paes/${pao.id}`, data);
        showToast("Pão atualizado", "success");
      } else {
        await api.post("/admin/cardapio/paes", data);
        showToast("Pão criado", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast("Não foi possível salvar o pão. O nome pode já existir.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pao ? "Editar pão" : "Novo pão"}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting} fullWidth>
            Salvar
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome" {...register("nome")} error={errors.nome?.message} />
        <Input
          label="Preço adicional (R$)"
          type="number"
          step="0.01"
          hint="Some ao preço do lanche. Use 0 para o pão padrão."
          {...register("precoAdicional", { valueAsNumber: true })}
          error={errors.precoAdicional?.message}
        />
        <Input
          label="Ordem"
          type="number"
          hint="Menor número aparece primeiro."
          {...register("ordem", { valueAsNumber: true })}
          error={errors.ordem?.message}
        />
      </form>
    </Modal>
  );
}
