"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AbaFichas } from "@/components/estoque/AbaFichas";
import { AbaInsumos } from "@/components/estoque/AbaInsumos";
import { AbaMovimentos } from "@/components/estoque/AbaMovimentos";
import { VisaoGeral } from "@/components/estoque/VisaoGeral";
import { getDefaultRoute } from "@/lib/painel-routes";
import { useAuthStore } from "@/store/authStore";
import { useEstoqueStore } from "@/store/estoqueStore";

type Aba = "geral" | "insumos" | "fichas" | "movimentos";

const ROTULO: Record<Aba, string> = {
  geral: "Visão geral",
  insumos: "Insumos",
  fichas: "Fichas",
  movimentos: "Movimentos",
};

function EstoqueConteudo() {
  const router = useRouter();
  const funcionario = useAuthStore((s) => s.funcionario);
  const config = useEstoqueStore((s) => s.config);
  const carregado = useEstoqueStore((s) => s.carregado);
  const carregarConfig = useEstoqueStore((s) => s.carregarConfig);
  const carregarSelo = useEstoqueStore((s) => s.carregarSelo);
  const isAdmin = funcionario?.perfil === "ADMIN";
  const [aba, setAba] = useState<Aba>(isAdmin ? "geral" : "insumos");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void carregarConfig();
  }, [carregarConfig]);

  // Módulo desabilitado: o atendente nem sabe que ele existe; o ADMIN vê como ligar.
  useEffect(() => {
    if (carregado && !config?.habilitado && funcionario && !isAdmin) {
      router.replace(getDefaultRoute(funcionario.perfil));
    }
  }, [carregado, config, funcionario, isAdmin, router]);

  const aoMudar = useCallback(() => {
    setVersao((v) => v + 1);
    if (isAdmin) void carregarSelo();
  }, [isAdmin, carregarSelo]);

  if (!carregado || !funcionario) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!config?.habilitado) {
    if (!isAdmin) {
      return (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }
    return (
      <div
        className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm"
        data-testid="estoque-desativado"
      >
        <Boxes size={32} className="mx-auto text-gray-400" />
        <h2 className="mt-3 text-base font-bold text-gray-900">O controle de estoque está desativado</h2>
        <p className="mt-1 text-sm text-gray-600">
          Quando você ativa, o sistema passa a controlar o saldo de cada insumo, calcular o custo e a
          margem de cada lanche e avisar o que está acabando. Desativar de novo não apaga nada.
        </p>
        <Link
          href="/loja"
          className="mt-4 inline-block rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Ativar em Loja e horários
        </Link>
      </div>
    );
  }

  const abas: Aba[] = isAdmin ? ["geral", "insumos", "fichas", "movimentos"] : ["insumos"];

  return (
    <>
      {abas.length > 1 && (
        <div role="tablist" className="scrollbar-hide mb-4 flex overflow-x-auto border-b border-gray-200">
          {abas.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={aba === t}
              onClick={() => setAba(t)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
                aba === t
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {ROTULO[t]}
            </button>
          ))}
        </div>
      )}

      {aba === "geral" && isAdmin && (
        <VisaoGeral
          versao={versao}
          onMudou={aoMudar}
          onIrParaAba={(destino) => setAba(destino)}
        />
      )}
      {aba === "insumos" && <AbaInsumos isAdmin={isAdmin} onMudou={aoMudar} />}
      {aba === "fichas" && isAdmin && <AbaFichas onMudou={aoMudar} />}
      {aba === "movimentos" && isAdmin && <AbaMovimentos />}
    </>
  );
}

export default function EstoquePage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Estoque">
        <EstoqueConteudo />
      </PainelShell>
    </ProtectedRoute>
  );
}
