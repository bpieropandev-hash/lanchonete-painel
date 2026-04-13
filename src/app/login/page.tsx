"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { loginSchema, type LoginInput } from "@/lib/validators";

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
      showToast("Bem-vindo!", "success");
      router.replace("/pedidos");
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.status === 401
          ? "E-mail ou senha incorretos"
          : "Erro ao fazer login. Tente novamente.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Interno</h1>
          <p className="mt-1 text-sm text-gray-600">
            Acesse com suas credenciais de funcionário
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
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
