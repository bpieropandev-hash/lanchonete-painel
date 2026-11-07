"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, clearTokens, mensagemErroApi } from "@/lib/api";
import { lerTokenDoFragmento } from "@/lib/functional";
import { useToastStore } from "@/store/toastStore";
import { novaSenhaPorEmailSchema, type NovaSenhaPorEmailInput } from "@/lib/validators";
import { LogoLoja } from "@/components/layout/LogoLoja";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);
  const [token, setToken] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NovaSenhaPorEmailInput>({ resolver: zodResolver(novaSenhaPorEmailSchema) });

  useEffect(() => {
    setToken(lerTokenDoFragmento(window.location.hash));
    // Tira o token da barra de endereço e do histórico.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    setPronto(true);
  }, []);

  const onSubmit = async (data: NovaSenhaPorEmailInput) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.post("/auth/funcionario/redefinir-senha", {
        token,
        novaSenha: data.novaSenha,
      });
      // As sessões antigas foram encerradas pela API; limpa o que ficou neste aparelho.
      clearTokens();
      showToast("Senha alterada. Entre com a nova senha.", "success");
      router.replace("/login");
    } catch (err) {
      showToast(mensagemErroApi(err, "Não foi possível alterar a senha."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <LogoLoja className="mb-4 h-10 w-10 text-sm" />
          <h1 className="text-xl font-semibold text-gray-900">Criar nova senha</h1>
        </div>

        {pronto && !token ? (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
            <p role="alert">Este link é inválido ou está incompleto.</p>
            <Link href="/esqueci-senha" className="font-medium text-gray-900 hover:underline">
              Pedir um novo link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="space-y-4">
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
            </div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={!token}
              className="mt-6"
            >
              Salvar nova senha
            </Button>
            <p className="mt-4 text-center text-xs text-gray-500">
              Link expirado?{" "}
              <Link href="/esqueci-senha" className="underline">
                Peça outro
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
