"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "@/components/ui/LoadingSpinner";
import { getDefaultRoute } from "@/lib/painel-routes";

export default function HomePage() {
  const router = useRouter();
  const { hasHydrated, isAuthenticated, funcionario, hydrate } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    router.replace(getDefaultRoute(funcionario?.perfil ?? "ATENDENTE"));
  }, [hasHydrated, isAuthenticated, funcionario, router]);

  return <FullPageSpinner />;
}
