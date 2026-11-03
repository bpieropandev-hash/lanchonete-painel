"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardEdit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, mensagemErroApi } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import {
  UNIDADE_ROTULO,
  formatarNumero,
  numeroDe,
  textoCapacidade,
  textoCustoIncompleto,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { FichaApresentacao } from "@/types/estoque";
import { FichaModal } from "./FichaModal";

type Filtro = "TODOS" | "SEM_FICHA" | "SEM_ESTOQUE" | "CUSTO_INCOMPLETO";

const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: "TODOS", rotulo: "Todos os lanches" },
  { id: "SEM_FICHA", rotulo: "Sem ficha técnica" },
  { id: "SEM_ESTOQUE", rotulo: "Sem estoque (dá para fazer 0)" },
  { id: "CUSTO_INCOMPLETO", rotulo: "Custo incompleto" },
];

const passa = (f: FichaApresentacao, filtro: Filtro): boolean => {
  switch (filtro) {
    case "SEM_FICHA":
      return f.semFicha;
    case "SEM_ESTOQUE":
      return f.capacidade === 0;
    case "CUSTO_INCOMPLETO":
      return f.custoIncompleto;
    default:
      return true;
  }
};

function Dado({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{rotulo}</p>
      <p className={`text-sm font-semibold ${destaque ? "text-red-700" : "text-gray-900"}`}>{valor}</p>
    </div>
  );
}

interface AbaFichasProps {
  /** Quando a página precisa abrir a aba já com um filtro (vindo da Visão geral). */
  filtroInicial?: Filtro;
  onMudou: () => void;
}

export function AbaFichas({ filtroInicial = "TODOS", onMudou }: AbaFichasProps) {
  const [fichas, setFichas] = useState<FichaApresentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [editando, setEditando] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<FichaApresentacao[]>("/admin/estoque/fichas");
      setFichas(Array.isArray(data) ? data : []);
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível carregar as fichas."), "error");
    } finally {
      setCarregando(false);
    }
  }, [showToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const visiveis = useMemo(() => fichas.filter((f) => passa(f, filtro)), [fichas, filtro]);

  return (
    <div>
      <div className="mb-3 sm:w-72">
        <Select
          aria-label="Filtrar lanches"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
        >
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.rotulo}
            </option>
          ))}
        </Select>
      </div>

      {carregando ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-500 shadow-sm">
          {fichas.length === 0 ? "Nenhum lanche no cardápio ainda." : "Nenhum lanche com esse filtro"}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((f) => {
            const incompleto = textoCustoIncompleto(f);
            return (
              <li
                key={`${f.produtoId}-${f.varianteId ?? "base"}`}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                data-testid="ficha-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-gray-900">{f.nome}</p>
                    <p className="text-xs text-gray-500">Preço {formatBRL(f.preco)}</p>
                  </div>
                </div>

                {!f.semFicha && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Dado rotulo="Custo" valor={f.custo ? formatBRL(f.custo) : "—"} />
                    <Dado
                      rotulo="Margem"
                      valor={f.margem ? formatBRL(f.margem) : "—"}
                      destaque={numeroDe(f.margem) < 0}
                    />
                    <Dado
                      rotulo="CMV"
                      valor={f.cmvPercentual ? `${formatarNumero(f.cmvPercentual, 1)}%` : "—"}
                    />
                  </div>
                )}

                <p
                  className={`mt-3 text-sm font-medium ${
                    f.semFicha
                      ? "text-gray-500"
                      : f.capacidade === 0
                        ? "text-red-700"
                        : "text-gray-900"
                  }`}
                >
                  {textoCapacidade(f)}
                </p>
                {incompleto && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {incompleto}
                  </p>
                )}

                {f.itens.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-800">
                      Ver {f.itens.length} {f.itens.length === 1 ? "insumo" : "insumos"}
                      {f.origemFicha === "BASE" && f.varianteId ? " (ficha base)" : ""}
                    </summary>
                    <ul className="mt-1 divide-y divide-gray-100">
                      {f.itens.map((it) => (
                        <li key={it.insumoId} className="flex justify-between gap-2 py-1 text-xs text-gray-700">
                          <span className="min-w-0 break-words">{it.insumoNome}</span>
                          <span className="shrink-0 text-gray-500">
                            {formatarNumero(it.quantidade)} {UNIDADE_ROTULO[it.unidade]} · dá {formatarNumero(it.capacidade, 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="mt-auto pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    leftIcon={<ClipboardEdit size={16} />}
                    onClick={() => setEditando(f.produtoId)}
                  >
                    {f.semFicha ? "Montar ficha" : "Editar ficha"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FichaModal
        produtoId={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          void carregar();
          onMudou();
        }}
      />
    </div>
  );
}
