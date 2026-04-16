"use client";

import { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelRouteGuard } from "@/components/auth/PainelRouteGuard";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <PainelRouteGuard>{children}</PainelRouteGuard>
    </ProtectedRoute>
  );
}
