"use client";

import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import Link from "next/link";
import { mensagemErroApi } from "@/lib/api";
import { useEstoqueStore } from "@/store/estoqueStore";
import { useToastStore } from "@/store/toastStore";

/**
 * Interruptor do módulo de estoque (só ADMIN), na tela Loja. O dono decide se
 * quer o controle: desligado, o menu some e nada baixa, mas nada é apagado.
 */
export function CartaoControleEstoque() {
  const config = useEstoqueStore((s) => s.config);
  const carregado = useEstoqueStore((s) => s.carregado);
  const definirConfig = useEstoqueStore((s) => s.definirConfig);
  const carregarConfig = useEstoqueStore((s) => s.carregarConfig);
  const [salvando, setSalvando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const habilitado = !!config?.habilitado;

  useEffect(() => {
    if (!carregado) void carregarConfig();
  }, [carregado, carregarConfig]);

  const alternar = async () => {
    if (
      habilitado &&
      !window.confirm(
        "Desativar o controle de estoque? A baixa automática para e o menu Estoque some. Nada é apagado: ao ativar de novo, tudo volta.",
      )
    )
      return;
    setSalvando(true);
    try {
      await definirConfig({ habilitado: !habilitado });
      showToast(habilitado ? "Controle de estoque desativado" : "Controle de estoque ativado", "success");
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível alterar o controle de estoque."), "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="cartao-controle-estoque">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
        <Boxes size={18} /> Controle de estoque
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Controla o saldo de cada insumo, calcula o custo e a margem de cada lanche e avisa o que está
        acabando. É opcional: se você não quer, deixe desativado e o painel continua como sempre.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Usar controle de estoque</p>
          <p className="text-xs text-gray-500" data-testid="estoque-estado">
            {!carregado
              ? "Verificando…"
              : habilitado
                ? config?.ativo
                  ? "Ativado · baixa automática ligada"
                  : "Ativado · baixa automática ainda desligada"
                : "Desativado"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={habilitado}
          aria-label="Usar controle de estoque"
          disabled={!carregado || salvando}
          onClick={() => void alternar()}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            habilitado ? "bg-primary-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              habilitado ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {habilitado && (
        <Link href="/estoque" className="mt-3 inline-block text-sm font-semibold text-primary-700 underline">
          Abrir o estoque
        </Link>
      )}
    </section>
  );
}
