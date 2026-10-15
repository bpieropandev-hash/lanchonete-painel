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
  const { funcionario, isAuthenticated, hasHydrated, hydrate, hydrationError, isHydrating } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (!hasHydrated || hydrationError || isHydrating) return;
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
  }, [hasHydrated, hydrationError, isHydrating, isAuthenticated, allowedProfiles, funcionario, router]);

  if (hydrationError) {
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center text-sm">
        <p>{hydrationError}</p>
        <button className="font-semibold underline" onClick={() => void hydrate()}>Tentar novamente</button>
      </div>
    );
  }

  if (!hasHydrated || isHydrating || !isAuthenticated) {
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
