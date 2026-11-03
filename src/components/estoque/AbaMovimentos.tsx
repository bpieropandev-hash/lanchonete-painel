"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, mensagemErroApi } from "@/lib/api";
import { formatBRL, formatDataHora } from "@/lib/format";
import {
  TIPO_MOVIMENTO_ROTULO,
  UNIDADE_ROTULO,
  entradaOuSaida,
  formatarNumero,
  formatarVariacao,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type {
  Insumo,
  MovimentoEstoque,
  MovimentosPaginados,
  TipoMovimento,
  UnidadeInsumo,
} from "@/types/estoque";

const LIMITE = 30;

const COR_TIPO: Record<TipoMovimento, string> = {
  COMPRA: "bg-green-100 text-green-800",
  CONSUMO: "bg-blue-100 text-blue-800",
  PERDA: "bg-red-100 text-red-800",
  AJUSTE: "bg-gray-200 text-gray-700",
};

function Tipo({ tipo }: { tipo: TipoMovimento }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COR_TIPO[tipo]}`}>
      {TIPO_MOVIMENTO_ROTULO[tipo]}
    </span>
  );
}

/** Histórico do livro de lançamentos (ADMIN): nunca se edita, só se lança de novo. */
export function AbaMovimentos() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumoId, setInsumoId] = useState("");
  const [tipo, setTipo] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<MovimentosPaginados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    api
      .get<Insumo[]>("/admin/estoque/insumos?incluirInativos=true")
      .then(({ data }) => setInsumos(Array.isArray(data) ? data : []))
      .catch(() => setInsumos([]));
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE) });
      if (insumoId) params.set("insumoId", insumoId);
      if (tipo) params.set("tipo", tipo);
      if (de) params.set("de", de);
      if (ate) params.set("ate", ate);
      const { data } = await api.get<MovimentosPaginados>(`/admin/estoque/movimentos?${params}`);
      setDados(data);
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível carregar o histórico."), "error");
    } finally {
      setCarregando(false);
    }
  }, [pagina, insumoId, tipo, de, ate, showToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const unidadeDe = (m: MovimentoEstoque): UnidadeInsumo =>
    insumos.find((i) => i.id === m.insumoId)?.unidade ?? "UN";
  const comFiltro = (acao: () => void) => () => {
    setPagina(1);
    acao();
  };

  const detalhe = (m: MovimentoEstoque): string =>
    [m.fornecedor, m.motivo, m.pedidoId ? "Baixa de pedido" : null].filter(Boolean).join(" · ");

  const movimentos = dados?.data ?? [];

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Select
            aria-label="Insumo"
            value={insumoId}
            onChange={(e) => comFiltro(() => setInsumoId(e.target.value))()}
          >
            <option value="">Todos os insumos</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
        </div>
        <Select
          aria-label="Tipo de lançamento"
          value={tipo}
          onChange={(e) => comFiltro(() => setTipo(e.target.value))()}
        >
          <option value="">Todos os tipos</option>
          {(Object.keys(TIPO_MOVIMENTO_ROTULO) as TipoMovimento[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_MOVIMENTO_ROTULO[t]}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="De"
          value={de}
          onChange={(e) => comFiltro(() => setDe(e.target.value))()}
        />
        <Input
          type="date"
          aria-label="Até"
          value={ate}
          onChange={(e) => comFiltro(() => setAte(e.target.value))()}
        />
      </div>

      {carregando && !dados ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : movimentos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-500 shadow-sm">
          Nenhum lançamento{insumoId || tipo || de || ate ? " com esses filtros" : " ainda"}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {movimentos.map((m) => (
              <li key={m.id} className="p-3" data-testid="movimento-item">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium text-gray-900">{m.insumoNome ?? "—"}</p>
                  <Tipo tipo={m.tipo} />
                </div>
                <p
                  className={`mt-1 text-base font-semibold ${
                    entradaOuSaida(m.quantidade) === "saida" ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {formatarVariacao(m.quantidade, unidadeDe(m))}
                </p>
                <p className="text-xs text-gray-500">
                  Saldo depois: {formatarNumero(m.saldoApos)} {UNIDADE_ROTULO[unidadeDe(m)]}
                  {m.valorTotal !== undefined && <> · {formatBRL(m.valorTotal)}</>}
                </p>
                {detalhe(m) && <p className="mt-0.5 break-words text-xs text-gray-500">{detalhe(m)}</p>}
                <p className="mt-0.5 text-xs text-gray-400">{formatDataHora(m.criadoEm)}</p>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Insumo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Quantidade</th>
                  <th className="px-3 py-2 text-right">Saldo depois</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimentos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50" data-testid="movimento-item">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatDataHora(m.criadoEm)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{m.insumoNome ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Tipo tipo={m.tipo} />
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                        entradaOuSaida(m.quantidade) === "saida" ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {formatarVariacao(m.quantidade, unidadeDe(m))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {formatarNumero(m.saldoApos)} {UNIDADE_ROTULO[unidadeDe(m)]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {m.valorTotal !== undefined ? formatBRL(m.valorTotal) : "—"}
                    </td>
                    <td className="max-w-xs break-words px-3 py-2 text-gray-500">{detalhe(m) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-sm text-gray-600">
            <span>
              {dados?.total} {dados?.total === 1 ? "lançamento" : "lançamentos"} · página {dados?.pagina} de{" "}
              {Math.max(dados?.totalPaginas ?? 1, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                aria-label="Página anterior"
                disabled={pagina <= 1 || carregando}
                onClick={() => setPagina((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Próxima página"
                disabled={pagina >= (dados?.totalPaginas ?? 1) || carregando}
                onClick={() => setPagina((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
