"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackageMinus,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Edit,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AcaoBotao } from "@/components/ui/LinhaAcoes";
import { api, mensagemErroApi } from "@/lib/api";
import {
  UNIDADE_ROTULO,
  formatarCustoUnitario,
  formatarQuantidade,
  numeroDe,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { Insumo, ResultadoLancamento } from "@/types/estoque";
import { AjusteModal } from "./AjusteModal";
import { CompraModal } from "./CompraModal";
import { InsumoModal } from "./InsumoModal";
import { PerdaModal } from "./PerdaModal";
import { StatusInsumo } from "./StatusInsumo";

type FiltroStatus = "TODOS" | "A_REPOR" | "OK" | "BAIXO" | "ZERADO" | "NEGATIVO";

const FILTROS: Array<{ id: FiltroStatus; rotulo: string }> = [
  { id: "TODOS", rotulo: "Todos" },
  { id: "A_REPOR", rotulo: "A repor" },
  { id: "BAIXO", rotulo: "Baixo" },
  { id: "ZERADO", rotulo: "Zerado" },
  { id: "NEGATIVO", rotulo: "Negativo" },
  { id: "OK", rotulo: "OK" },
];

const passaNoFiltro = (i: Insumo, f: FiltroStatus): boolean => {
  if (f === "TODOS") return true;
  if (f === "A_REPOR") return ["BAIXO", "ZERADO", "NEGATIVO"].includes(i.status);
  return i.status === f;
};

interface AbaInsumosProps {
  /** ADMIN vê custos e cadastra/edita; ATENDENTE só lança compras e perdas. */
  isAdmin: boolean;
  /** Avisa a página que algo mudou (selo do menu, visão geral). */
  onMudou: () => void;
}

export function AbaInsumos({ isAdmin, onMudou }: AbaInsumosProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("TODOS");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [comprando, setComprando] = useState<Insumo | null>(null);
  const [perdendo, setPerdendo] = useState<Insumo | null>(null);
  const [ajustando, setAjustando] = useState<Insumo | null>(null);
  const showToast = useToastStore((s) => s.show);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<Insumo[]>(
        `/admin/estoque/insumos${isAdmin ? "?incluirInativos=true" : ""}`,
      );
      setInsumos(Array.isArray(data) ? data : []);
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível carregar os insumos."), "error");
    } finally {
      setCarregando(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const aplicar = (atualizado: Insumo) => {
    setInsumos((prev) => {
      const existe = prev.some((i) => i.id === atualizado.id);
      const lista = existe
        ? prev.map((i) => (i.id === atualizado.id ? atualizado : i))
        : [...prev, atualizado];
      return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    });
    onMudou();
  };
  const aposLancamento = (r: ResultadoLancamento) => aplicar(r.insumo);

  const alternarAtivo = async (i: Insumo) => {
    try {
      const { data } = await api.patch<Insumo>(`/admin/estoque/insumos/${i.id}/toggle-ativo`);
      aplicar(data);
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível alterar o insumo."), "error");
    }
  };

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return insumos.filter(
      (i) =>
        (mostrarInativos || i.ativo) &&
        passaNoFiltro(i, filtro) &&
        (termo === "" || i.nome.toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [insumos, busca, filtro, mostrarInativos]);

  const custoDe = (i: Insumo): string =>
    i.custoMedio !== undefined && numeroDe(i.custoMedio) > 0
      ? `${formatarCustoUnitario(i.custoMedio)} / ${UNIDADE_ROTULO[i.unidade]}`
      : "sem custo";

  const acoes = (i: Insumo, rotulos: boolean) => (
    <>
      {i.ativo && (
        <>
          <AcaoBotao
            icone={<PackagePlus size={16} />}
            nome="Compra"
            onClick={() => setComprando(i)}
            tom="ligado"
            rotulo={rotulos}
          />
          <AcaoBotao
            icone={<PackageMinus size={16} />}
            nome="Perda"
            onClick={() => setPerdendo(i)}
            tom="perigo"
            rotulo={rotulos}
          />
        </>
      )}
      {isAdmin && (
        <>
          {i.ativo && (
            <AcaoBotao
              icone={<SlidersHorizontal size={16} />}
              nome="Ajustar"
              onClick={() => setAjustando(i)}
              rotulo={rotulos}
            />
          )}
          <AcaoBotao
            icone={<Edit size={16} />}
            nome="Editar"
            onClick={() => {
              setEditando(i);
              setFormAberto(true);
            }}
            rotulo={rotulos}
          />
          <AcaoBotao
            icone={<Power size={16} />}
            nome={i.ativo ? "Desativar" : "Ativar"}
            onClick={() => void alternarAtivo(i)}
            tom={i.ativo ? "ligado" : "desligado"}
            rotulo={rotulos}
          />
        </>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Buscar insumo"
            placeholder="Buscar insumo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          />
        </div>
        <div className="sm:w-44">
          <Select
            aria-label="Filtrar por situação"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroStatus)}
          >
            {FILTROS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.rotulo}
              </option>
            ))}
          </Select>
        </div>
        {isAdmin && (
          <Button
            className="w-full sm:w-auto"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            Novo insumo
          </Button>
        )}
      </div>

      {isAdmin && (
        <label className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          Mostrar insumos desativados
        </label>
      )}

      {carregando ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-500 shadow-sm">
          {insumos.length === 0
            ? isAdmin
              ? "Nenhum insumo cadastrado. Comece pelos itens que mais pesam no custo: pão, carne, queijo, bacon, batata, refrigerante."
              : "Nenhum insumo cadastrado ainda. Peça ao administrador."
            : "Nenhum insumo com esse filtro"}
        </div>
      ) : (
        <>
          {/* Celular: um cartão por insumo */}
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:hidden">
            {visiveis.map((i) => (
              <li key={i.id} className="p-3" data-testid="insumo-item">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">{i.nome}</p>
                    <p className="mt-0.5 text-lg font-semibold text-gray-900">
                      {formatarQuantidade(i.saldo, i.unidade)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Mínimo: {formatarQuantidade(i.estoqueMinimo, i.unidade)}
                      {isAdmin && <> · Custo: {custoDe(i)}</>}
                    </p>
                  </div>
                  <StatusInsumo status={i.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{acoes(i, true)}</div>
              </li>
            ))}
          </ul>

          {/* Tablet/desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Insumo</th>
                  <th className="px-3 py-2">Saldo</th>
                  <th className="px-3 py-2">Mínimo</th>
                  <th className="px-3 py-2">Situação</th>
                  {isAdmin && <th className="px-3 py-2">Custo médio</th>}
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiveis.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50" data-testid="insumo-item">
                    <td className="px-3 py-2 font-medium text-gray-900">{i.nome}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                      {formatarQuantidade(i.saldo, i.unidade)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {formatarQuantidade(i.estoqueMinimo, i.unidade)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusInsumo status={i.status} />
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{custoDe(i)}</td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">{acoes(i, false)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <InsumoModal
        open={formAberto}
        insumo={editando}
        onClose={() => setFormAberto(false)}
        onSaved={aplicar}
      />
      <CompraModal
        insumo={comprando}
        verCustos={isAdmin}
        onClose={() => setComprando(null)}
        onSaved={aposLancamento}
      />
      <PerdaModal insumo={perdendo} onClose={() => setPerdendo(null)} onSaved={aposLancamento} />
      <AjusteModal insumo={ajustando} onClose={() => setAjustando(null)} onSaved={aposLancamento} />
    </div>
  );
}
