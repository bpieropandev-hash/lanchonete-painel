"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "@/components/ui/LoadingSpinner";
import {
  getDefaultRoute,
  isPainelRouteAllowed,
} from "@/lib/painel-routes";

export function PainelRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { funcionario, hasHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !funcionario) return;
    if (!isPainelRouteAllowed(funcionario.perfil, pathname)) {
      router.replace(getDefaultRoute(funcionario.perfil));
    }
  }, [hasHydrated, isAuthenticated, funcionario, pathname, router]);

  if (!hasHydrated || !isAuthenticated || !funcionario) {
    return <>{children}</>;
  }

  if (!isPainelRouteAllowed(funcionario.perfil, pathname)) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}
