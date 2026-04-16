"use client";

import { Bike, LogOut } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";

function EntregaPageContent() {
  const logout = useAuthStore((s) => s.logout);
  const funcionario = useAuthStore((s) => s.funcionario);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700 bg-zinc-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <Bike size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Entregas</h1>
            {funcionario && (
              <p className="text-xs text-zinc-400">{funcionario.nome}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <Bike size={72} className="mb-6 text-zinc-600" />
        <p className="max-w-md text-lg text-zinc-300">
          Área do entregador em desenvolvimento. Em breve: lista de pedidos em
          rota e acompanhamento em tempo real pela localização.
        </p>
      </main>
    </div>
  );
}

export default function EntregaPage() {
  return (
    <ProtectedRoute allowedProfiles={["ENTREGADOR", "ADMIN"]}>
      <EntregaPageContent />
    </ProtectedRoute>
  );
}
