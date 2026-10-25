"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { perfilLabel } from "@/lib/format";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { PerfilUsuario, Usuario } from "@/types";

interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  usuario: Usuario | null;
}

const PERFIS: PerfilUsuario[] = ["ADMIN", "ATENDENTE", "CHAPEIRO", "ENTREGADOR"];

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().optional(),
  perfil: z.enum(["ADMIN", "ATENDENTE", "CHAPEIRO", "ENTREGADOR"]),
});
type FormData = z.infer<typeof schema>;

export function UsuarioModal({
  open,
  onClose,
  onSaved,
  usuario,
}: UsuarioModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const isEdit = !!usuario;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (usuario) {
        reset({
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          senha: "",
        });
      } else {
        reset({
          nome: "",
          email: "",
          senha: "",
          perfil: "ATENDENTE",
        });
      }
    }
  }, [open, usuario, reset]);

  const onSubmit = async (data: FormData) => {
    if (!isEdit && (!data.senha || data.senha.length < 10)) {
      setError("senha", { message: "Senha deve ter no mínimo 10 caracteres" });
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && usuario) {
        await api.patch(`/usuarios/${usuario.id}`, {
          nome: data.nome,
          email: data.email,
          perfil: data.perfil,
        });
        showToast("Usuário atualizado", "success");
      } else {
        await api.post("/usuarios", {
          nome: data.nome,
          email: data.email,
          senha: data.senha,
          perfil: data.perfil,
        });
        showToast("Usuário criado", "success");
      }
      onSaved();
      onClose();
    } catch {
      showToast(isEdit ? "Não foi possível atualizar o usuário." : "Não foi possível criar o usuário.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar usuário" : "Novo usuário"}
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
        <Input
          label="Nome"
          {...register("nome")}
          error={errors.nome?.message}
        />
        <Input
          label="E-mail"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />
        {!isEdit && (
          <Input
            label="Senha"
            type="password"
            {...register("senha")}
            error={errors.senha?.message}
          />
        )}
        <Select
          label="Perfil"
          {...register("perfil")}
          error={errors.perfil?.message}
        >
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {perfilLabel(p)}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
