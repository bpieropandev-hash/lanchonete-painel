"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { esqueciSenhaSchema, type EsqueciSenhaInput } from "@/lib/validators";
import { LogoLoja } from "@/components/layout/LogoLoja";

export default function EsqueciSenhaPage() {
  const showToast = useToastStore((s) => s.show);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaInput>({ resolver: zodResolver(esqueciSenhaSchema) });

  const onSubmit = async (data: EsqueciSenhaInput) => {
    setSubmitting(true);
    try {
      await api.post("/auth/funcionario/esqueci-senha", { email: data.email });
      setEnviado(true);
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível enviar. Tente novamente."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <LogoLoja className="mb-4 h-10 w-10 text-sm" />
          <h1 className="text-xl font-semibold text-gray-900">Esqueci minha senha</h1>
        </div>

        {enviado ? (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
            <p role="status">
              Se esse e-mail estiver cadastrado no painel, enviamos um link para criar uma
              nova senha. Ele vale por 30 minutos.
            </p>
            <p className="text-gray-500">
              Não chegou? Veja a caixa de spam. Se não tiver mais acesso a esse e-mail,
              peça ao administrador para redefinir sua senha.
            </p>
            <Link href="/login" className="font-medium text-gray-900 hover:underline">
              Voltar para entrar
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <p className="mb-4 text-sm text-gray-600">
              Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </p>
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Button type="submit" fullWidth size="lg" loading={submitting} className="mt-6">
              Enviar link
            </Button>
            <Link
              href="/login"
              className="mt-4 block text-center text-sm font-medium text-gray-700 hover:underline"
            >
              Voltar para entrar
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
