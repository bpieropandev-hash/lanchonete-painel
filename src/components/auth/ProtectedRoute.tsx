"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "@/components/ui/LoadingSpinner";
import type { PerfilUsuario } from "@/types";
import { getDefaultRoute } from "@/lib/painel-routes";

export { getDefaultRoute } from "@/lib/painel-routes";

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
