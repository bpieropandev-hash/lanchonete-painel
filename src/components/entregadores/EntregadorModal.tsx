"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { entregadorSchema, type EntregadorInput } from "@/lib/validators";
import { api, mensagemErroApi } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Entregador, Usuario } from "@/types";

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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
        usuarioId: entregador?.usuarioId || "",
      });
    }
  }, [open, entregador, reset]);

  // Contas que podem entrar na tela de entregas
  useEffect(() => {
    if (!open) return;
    api
      .get<Usuario[]>("/usuarios")
      .then(({ data }) =>
        setUsuarios(
          (Array.isArray(data) ? data : []).filter(
            (u) => u.perfil === "ENTREGADOR"
          )
        )
      )
      .catch(() => setUsuarios([]));
  }, [open]);

  const onSubmit = async (form: EntregadorInput) => {
    setSubmitting(true);
    const data = { ...form, usuarioId: form.usuarioId || null };
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
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível salvar o entregador."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entregador ? "Editar entregador" : "Novo entregador"}
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
        <Select
          label="Acesso à tela de entregas"
          {...register("usuarioId")}
          hint={
            usuarios.length === 0
              ? "Crie um usuário com perfil Entregador em Usuários para ele ver as entregas no celular"
              : "Login que este entregador usa para ver as entregas dele"
          }
        >
          <option value="">Sem acesso</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome} ({u.email}){u.ativo ? "" : " - inativo"}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
