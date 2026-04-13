"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { entregadorSchema, type EntregadorInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Entregador } from "@/types";

interface EntregadorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entregador: Entregador | null;
}

export function EntregadorModal({
  open,
  onClose,
  onSaved,
  entregador,
}: EntregadorModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntregadorInput>({
    resolver: zodResolver(entregadorSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: entregador?.nome || "",
        telefone: entregador?.telefone || "",
      });
    }
  }, [open, entregador, reset]);

  const onSubmit = async (data: EntregadorInput) => {
    setSubmitting(true);
    try {
      if (entregador) {
        await api.patch(`/admin/entregadores/${entregador.id}`, data);
        showToast("Entregador atualizado", "success");
      } else {
        await api.post("/admin/entregadores", data);
        showToast("Entregador cadastrado", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast("Erro ao salvar entregador", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entregador ? "Editar Entregador" : "Novo Entregador"}
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
          label="Telefone (somente dígitos)"
          placeholder="11999998888"
          {...register("telefone")}
          error={errors.telefone?.message}
          hint="10 ou 11 dígitos, sem traço ou parênteses"
        />
      </form>
    </Modal>
  );
}
