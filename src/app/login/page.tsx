"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { iniciaisLoja, NOME_LOJA } from "@/lib/marca";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, hasHydrated, hydrate } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/pedidos");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      await login(data.email, data.senha);
      router.replace("/pedidos");
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.status === 401
          ? "E-mail ou senha incorretos"
          : "Não foi possível entrar. Tente novamente.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white">
            {iniciaisLoja()}
          </span>
          <h1 className="text-xl font-semibold text-gray-900">Entrar no painel</h1>
          <p className="mt-1 text-sm text-gray-500">{NOME_LOJA}</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("senha")}
              error={errors.senha?.message}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={submitting}
            className="mt-6"
          >
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Acesso restrito a funcionários autorizados.
        </p>
      </div>
    </div>
  );
}
