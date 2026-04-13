"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "@/components/ui/LoadingSpinner";
import type { PerfilUsuario } from "@/types";

export function getDefaultRoute(perfil: PerfilUsuario): string {
  switch (perfil) {
    case "CHAPEIRO":
      return "/chapeiro";
    case "ENTREGADOR":
      return "/chapeiro";
    default:
      return "/pedidos";
  }
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedProfiles?: PerfilUsuario[];
}

export function ProtectedRoute({
  children,
  allowedProfiles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { funcionario, isAuthenticated, hasHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (
      allowedProfiles &&
      funcionario &&
      !allowedProfiles.includes(funcionario.perfil)
    ) {
      router.replace(getDefaultRoute(funcionario.perfil));
    }
  }, [hasHydrated, isAuthenticated, allowedProfiles, funcionario, router]);

  if (!hasHydrated || !isAuthenticated) {
    return <FullPageSpinner />;
  }

  if (
    allowedProfiles &&
    funcionario &&
    !allowedProfiles.includes(funcionario.perfil)
  ) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}
