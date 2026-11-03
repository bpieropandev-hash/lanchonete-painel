"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_ROTULO,
  formatarNumero,
  validarDecimal,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { FichaProduto, Insumo } from "@/types/estoque";

interface Linha {
  chave: number;
  insumoId: string;
  quantidade: string;
}

const BASE = "base";

interface FichaModalProps {
  /** Nulo = fechado. */
  produtoId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Ficha técnica de um lanche: o que UMA unidade consome de cada insumo.
 * Há a ficha base (vale para o produto e para toda variante sem linhas
 * próprias) e, se quiser, uma ficha por variante (ex.: Lata × 2 L).
 */
export function FichaModal({ produtoId, onClose, onSaved }: FichaModalProps) {
  const [ficha, setFicha] = useState<FichaProduto | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [linhas, setLinhas] = useState<Record<string, Linha[]>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [escopo, setEscopo] = useState(BASE);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const proximaChave = useRef(1);
  const showToast = useToastStore((s) => s.show);

  const assinatura = (rows: Linha[]) =>
    JSON.stringify(
      rows
        .map((l) => [l.insumoId, l.quantidade.trim()])
        .sort((a, b) => a[0].localeCompare(b[0])),
    );

  const carregar = useCallback(
    async (id: string) => {
      setCarregando(true);
      try {
        const [f, i] = await Promise.all([
          api.get<FichaProduto>(`/admin/estoque/fichas/${id}`),
          api.get<Insumo[]>("/admin/estoque/insumos?incluirInativos=true"),
        ]);
        const doEscopo = (itens: FichaProduto["base"]): Linha[] =>
          itens.map((it) => ({
            chave: proximaChave.current++,
            insumoId: it.insumoId,
            quantidade: formatarNumero(it.quantidade),
          }));
        const todas: Record<string, Linha[]> = { [BASE]: doEscopo(f.data.base) };
        for (const v of f.data.variantes) todas[v.id] = doEscopo(v.itens);
        setFicha(f.data);
        setInsumos(Array.isArray(i.data) ? i.data : []);
        setLinhas(todas);
        setOriginal(
          Object.fromEntries(Object.entries(todas).map(([k, v]) => [k, assinatura(v)])),
        );
        setEscopo(BASE);
        setErros({});
      } catch (erro) {
        showToast(mensagemErroApi(erro, "Não foi possível carregar a ficha."), "error");
        onClose();
      } finally {
        setCarregando(false);
      }
    },
    [onClose, showToast],
  );

  useEffect(() => {
    if (produtoId) void carregar(produtoId);
    else {
      setFicha(null);
      setLinhas({});
    }
    // Recarregar só quando o produto muda; `carregar` não deve disparar de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  if (!produtoId) return null;

  const atuais = linhas[escopo] ?? [];
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const mudou = (chaveEscopo: string) =>
    assinatura(linhas[chaveEscopo] ?? []) !== original[chaveEscopo];
  const algumMudou = Object.keys(linhas).some(mudou);

  const alterar = (chave: number, mudanca: Partial<Linha>) =>
    setLinhas((prev) => ({
      ...prev,
      [escopo]: prev[escopo].map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)),
    }));
  const adicionar = () =>
    setLinhas((prev) => ({
      ...prev,
      [escopo]: [
        ...prev[escopo],
        { chave: proximaChave.current++, insumoId: "", quantidade: "" },
      ],
    }));
  const remover = (chave: number) =>
    setLinhas((prev) => ({
      ...prev,
      [escopo]: prev[escopo].filter((l) => l.chave !== chave),
    }));

  const salvar = async () => {
    // Valida tudo antes de gravar qualquer escopo.
    const novosErros: Record<string, string> = {};
    const corpos: Array<{ escopo: string; itens: Array<{ insumoId: string; quantidade: number }> }> = [];
    for (const [chaveEscopo, rows] of Object.entries(linhas)) {
      if (!mudou(chaveEscopo)) continue;
      const itens: Array<{ insumoId: string; quantidade: number }> = [];
      for (const [indice, l] of rows.entries()) {
        const nomeLinha = `linha ${indice + 1}`;
        if (!l.insumoId) {
          novosErros[chaveEscopo] = `Escolha o insumo da ${nomeLinha}`;
          break;
        }
        const q = validarDecimal(l.quantidade, {
          rotulo: `Quantidade da ${nomeLinha}`,
          casas: 3,
          min: 0,
          minExclusivo: true,
          max: LIMITES_ESTOQUE.QUANTIDADE,
        });
        if (!q.ok) {
          novosErros[chaveEscopo] = q.erro;
          break;
        }
        itens.push({ insumoId: l.insumoId, quantidade: q.valor });
      }
      if (!novosErros[chaveEscopo]) corpos.push({ escopo: chaveEscopo, itens });
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      setEscopo(Object.keys(novosErros)[0]);
      return;
    }

    setSalvando(true);
    try {
      for (const c of corpos) {
        await api.put(`/admin/estoque/fichas/${produtoId}`, {
          ...(c.escopo === BASE ? {} : { varianteId: c.escopo }),
          itens: c.itens,
        });
      }
      showToast("Ficha técnica salva", "success");
      onSaved();
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível salvar a ficha."), "error");
      // O que já foi gravado fica; recarrega para a tela refletir o banco.
      await carregar(produtoId);
    } finally {
      setSalvando(false);
    }
  };

  const abas = ficha
    ? [
        { id: BASE, rotulo: ficha.variantes.length > 0 ? "Ficha base" : "Ficha" },
        ...ficha.variantes.map((v) => ({ id: v.id, rotulo: v.nome })),
      ]
    : [];
  const semLinhasNaVariante = escopo !== BASE && atuais.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={ficha ? `Ficha técnica: ${ficha.produto.nome}` : "Ficha técnica"}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={salvando} disabled={!algumMudou || carregando} fullWidth>
            Salvar ficha
          </Button>
        </div>
      }
    >
      {carregando || !ficha ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Informe quanto <strong>uma unidade</strong> do lanche consome de cada insumo, na
            unidade do insumo.
          </p>

          {abas.length > 1 && (
            <div role="tablist" className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-gray-200">
              {abas.map((a) => (
                <button
                  key={a.id}
                  role="tab"
                  type="button"
                  aria-selected={escopo === a.id}
                  onClick={() => setEscopo(a.id)}
                  className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${
                    escopo === a.id
                      ? "border-primary-500 text-primary-700"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {a.rotulo}
                  {a.id !== BASE && (linhas[a.id]?.length ?? 0) > 0 && (
                    <span className="ml-1 text-xs text-gray-400">({linhas[a.id].length})</span>
                  )}
                  {mudou(a.id) && <span className="ml-1 text-primary-500" aria-label="alterada">•</span>}
                </button>
              ))}
            </div>
          )}

          {semLinhasNaVariante && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Esta variante não tem ficha própria: usa a <strong>ficha base</strong>. Adicione
              insumos aqui só se ela consome algo diferente (a ficha própria <em>substitui</em> a
              base, não soma).
            </p>
          )}

          {atuais.length === 0 && escopo === BASE && (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              Nenhum insumo ainda. Sem ficha, o lanche aparece como &ldquo;sem ficha&rdquo; e não baixa estoque.
            </p>
          )}

          <ul className="space-y-3">
            {atuais.map((l) => {
              const escolhidos = new Set(atuais.filter((x) => x.chave !== l.chave).map((x) => x.insumoId));
              const selecionado = insumoPorId.get(l.insumoId);
              return (
                <li key={l.chave} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_auto]">
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      label="Insumo"
                      aria-label="Insumo"
                      value={l.insumoId}
                      onChange={(e) => alterar(l.chave, { insumoId: e.target.value })}
                    >
                      <option value="">Escolha…</option>
                      {insumos
                        .filter((i) => !escolhidos.has(i.id) && (i.ativo || i.id === l.insumoId))
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nome} ({UNIDADE_ROTULO[i.unidade]}){i.ativo ? "" : " (desativado)"}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <Input
                    label={`Quantidade${selecionado ? ` (${UNIDADE_ROTULO[selecionado.unidade]})` : ""}`}
                    aria-label="Quantidade"
                    inputMode="decimal"
                    autoComplete="off"
                    value={l.quantidade}
                    onChange={(e) => alterar(l.chave, { quantidade: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => remover(l.chave)}
                    className="mb-0.5 rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Remover insumo da ficha"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>

          {erros[escopo] && <p className="text-sm text-red-600">{erros[escopo]}</p>}

          {insumos.filter((i) => i.ativo).length === 0 ? (
            <p className="text-sm text-amber-700">
              Cadastre insumos na aba <strong>Insumos</strong> antes de montar a ficha.
            </p>
          ) : (
            <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={adicionar}>
              Adicionar insumo
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
