"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { senhaSchema, type SenhaInput } from "@/lib/validators";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";

interface SenhaModalProps {
  open: boolean;
  onClose: () => void;
  usuarioId: string | null;
  usuarioNome: string;
}

export function SenhaModal({
  open,
  onClose,
  usuarioId,
  usuarioNome,
}: SenhaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SenhaInput>({
    resolver: zodResolver(senhaSchema),
  });

  useEffect(() => {
    if (open) reset({ senhaAtual: "", novaSenha: "", confirmar: "" });
  }, [open, reset]);

  const onSubmit = async (data: SenhaInput) => {
    if (!usuarioId) return;
    setSubmitting(true);
    try {
      await api.patch(`/usuarios/${usuarioId}/senha`, {
        senhaAtual: data.senhaAtual,
        novaSenha: data.novaSenha,
      });
      showToast("Senha alterada com sucesso", "success");
      onClose();
    } catch {
      showToast("Erro ao alterar senha. Verifique a senha atual.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Alterar Senha — ${usuarioNome}`}
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
            Alterar Senha
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Senha Atual"
          type="password"
          {...register("senhaAtual")}
          error={errors.senhaAtual?.message}
        />
        <Input
          label="Nova Senha"
          type="password"
          {...register("novaSenha")}
          error={errors.novaSenha?.message}
        />
        <Input
          label="Confirmar Nova Senha"
          type="password"
          {...register("confirmar")}
          error={errors.confirmar?.message}
        />
      </form>
    </Modal>
  );
}
