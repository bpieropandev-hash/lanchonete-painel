"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  redefinirSenhaSchema,
  senhaSchema,
  type RedefinirSenhaInput,
  type SenhaInput,
} from "@/lib/validators";
import { api, mensagemErroApi, setTokens } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { AuthResponse } from "@/types";

interface SenhaModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * "propria": o funcionário logado troca a própria senha (pede a atual).
   * "redefinir": o administrador define uma senha nova para outro usuário.
   */
  modo: "propria" | "redefinir";
  usuarioId?: string | null;
  usuarioNome?: string;
}

export function SenhaModal(props: SenhaModalProps) {
  return props.modo === "propria" ? (
    <MinhaSenhaModal open={props.open} onClose={props.onClose} />
  ) : (
    <RedefinirSenhaModal {...props} />
  );
}

function MinhaSenhaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SenhaInput>({ resolver: zodResolver(senhaSchema) });

  useEffect(() => {
    if (open) reset({ senhaAtual: "", novaSenha: "", confirmar: "" });
  }, [open, reset]);

  const onSubmit = async (data: SenhaInput) => {
    setSubmitting(true);
    try {
      // A troca encerra todas as sessões; a API devolve uma sessão nova.
      const { data: sessao } = await api.patch<AuthResponse>("/auth/me/senha", {
        senhaAtual: data.senhaAtual,
        novaSenha: data.novaSenha,
      });
      setTokens(sessao.accessToken, sessao.refreshToken);
      showToast("Senha alterada. Outros aparelhos precisarão entrar de novo.", "success");
      onClose();
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível alterar a senha. Confira a senha atual."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar minha senha"
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting} fullWidth>
            Alterar Senha
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          {...register("senhaAtual")}
          error={errors.senhaAtual?.message}
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          {...register("novaSenha")}
          error={errors.novaSenha?.message}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          {...register("confirmar")}
          error={errors.confirmar?.message}
        />
      </form>
    </Modal>
  );
}

function RedefinirSenhaModal({ open, onClose, usuarioId, usuarioNome }: SenhaModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RedefinirSenhaInput>({ resolver: zodResolver(redefinirSenhaSchema) });

  useEffect(() => {
    if (open) reset({ novaSenha: "", confirmar: "" });
  }, [open, reset]);

  const onSubmit = async (data: RedefinirSenhaInput) => {
    if (!usuarioId) return;
    setSubmitting(true);
    try {
      await api.patch(`/usuarios/${usuarioId}/senha`, { novaSenha: data.novaSenha });
      showToast("Senha redefinida. As sessões do usuário foram encerradas.", "success");
      onClose();
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível redefinir a senha."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Redefinir Senha — ${usuarioNome ?? ""}`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting} fullWidth>
            Redefinir Senha
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">
          Passe a nova senha para a pessoa por um canal seguro. Ela será desconectada de todos os
          aparelhos.
        </p>
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          {...register("novaSenha")}
          error={errors.novaSenha?.message}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          {...register("confirmar")}
          error={errors.confirmar?.message}
        />
      </form>
    </Modal>
  );
}
