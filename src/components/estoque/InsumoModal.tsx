"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_NOME,
  UNIDADE_ROTULO,
  formatarNumero,
  numeroDe,
  validarDecimal,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { Ingrediente } from "@/types";
import type { Insumo, UnidadeInsumo } from "@/types/estoque";

interface InsumoModalProps {
  open: boolean;
  /** Nulo = novo insumo. */
  insumo: Insumo | null;
  onClose: () => void;
  onSaved: (insumo: Insumo) => void;
}

const vazioSeZero = (valor: string | null | undefined): string =>
  numeroDe(valor) === 0 ? "" : formatarNumero(valor);

/** Cadastro e edição de insumo (ADMIN). */
export function InsumoModal({ open, insumo, onClose, onSaved }: InsumoModalProps) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<UnidadeInsumo>("G");
  const [minimo, setMinimo] = useState("");
  const [unidadeCompra, setUnidadeCompra] = useState("");
  const [fator, setFator] = useState("");
  const [porcao, setPorcao] = useState("");
  const [ingredienteId, setIngredienteId] = useState("");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!open) return;
    setNome(insumo?.nome ?? "");
    setUnidade(insumo?.unidade ?? "G");
    setMinimo(vazioSeZero(insumo?.estoqueMinimo));
    setUnidadeCompra(insumo?.unidadeCompra ?? "");
    setFator(insumo?.unidadeCompra ? formatarNumero(insumo.fatorCompra) : "");
    setPorcao(insumo?.porcaoAdicional ? formatarNumero(insumo.porcaoAdicional) : "");
    setIngredienteId(insumo?.ingredienteId ?? "");
    setErros({});
    let cancelado = false;
    api
      .get<Ingrediente[]>("/admin/cardapio/ingredientes")
      .then(({ data }) => {
        if (!cancelado) setIngredientes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setIngredientes([]);
      });
    return () => {
      cancelado = true;
    };
  }, [open, insumo]);

  const rotuloBase = UNIDADE_ROTULO[unidade];

  const salvar = async () => {
    const novosErros: Record<string, string> = {};
    if (nome.trim().length < 1) novosErros.nome = "Informe o nome";

    let minimoNum = 0;
    if (minimo.trim() !== "") {
      const m = validarDecimal(minimo, {
        rotulo: "Estoque mínimo",
        casas: 3,
        min: 0,
        max: LIMITES_ESTOQUE.QUANTIDADE,
      });
      if (m.ok) minimoNum = m.valor;
      else novosErros.minimo = m.erro;
    }

    let porcaoNum: number | null = null;
    if (porcao.trim() !== "") {
      const p = validarDecimal(porcao, {
        rotulo: "Porção do adicional",
        casas: 3,
        min: 0,
        minExclusivo: true,
        max: LIMITES_ESTOQUE.QUANTIDADE,
      });
      if (p.ok) porcaoNum = p.valor;
      else novosErros.porcao = p.erro;
    }
    if (porcaoNum !== null && !ingredienteId) {
      novosErros.ingrediente = "Escolha o ingrediente que o cliente vê como adicional";
    }

    const compra = unidadeCompra.trim();
    let fatorNum = 1;
    if (compra) {
      const f = validarDecimal(fator, {
        rotulo: "Fator",
        casas: 3,
        min: 0,
        minExclusivo: true,
        max: LIMITES_ESTOQUE.QUANTIDADE,
      });
      if (f.ok) fatorNum = f.valor;
      else novosErros.fator = f.erro;
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const corpo = {
      nome: nome.trim(),
      unidade,
      estoqueMinimo: minimoNum,
      porcaoAdicional: porcaoNum,
      ingredienteId: ingredienteId || null,
      unidadeCompra: compra || null,
      fatorCompra: fatorNum,
    };
    setEnviando(true);
    try {
      const { data } = insumo
        ? await api.patch<Insumo>(`/admin/estoque/insumos/${insumo.id}`, corpo)
        : await api.post<Insumo>("/admin/estoque/insumos", corpo);
      showToast(insumo ? "Insumo atualizado" : "Insumo criado", "success");
      onSaved(data);
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível salvar o insumo."), "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={insumo ? "Editar insumo" : "Novo insumo"}
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={enviando} fullWidth>
            Salvar
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
        className="space-y-4"
      >
        <Input
          label="Nome"
          name="nome"
          autoComplete="off"
          maxLength={100}
          placeholder="Ex.: Blend 120 g, Queijo fatia, Lata 350 ml"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={erros.nome}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Unidade de controle"
            name="unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeInsumo)}
            hint={insumo ? "Só muda enquanto não houver lançamentos nem ficha." : undefined}
          >
            {(Object.keys(UNIDADE_NOME) as UnidadeInsumo[]).map((u) => (
              <option key={u} value={u}>
                {UNIDADE_NOME[u]}
              </option>
            ))}
          </Select>
          <Input
            label={`Estoque mínimo (${rotuloBase})`}
            name="minimo"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            error={erros.minimo}
            hint="Abaixo disso o item aparece como Baixo."
          />
        </div>

        <fieldset className="rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Como você compra (opcional)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unidade de compra"
              name="unidadeCompra"
              autoComplete="off"
              maxLength={20}
              placeholder="kg, L, caixa"
              value={unidadeCompra}
              onChange={(e) => setUnidadeCompra(e.target.value)}
            />
            <Input
              label={`1 ${unidadeCompra.trim() || "unidade"} = quantos ${rotuloBase}?`}
              name="fator"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1000"
              disabled={!unidadeCompra.trim()}
              value={fator}
              onChange={(e) => setFator(e.target.value)}
              error={erros.fator}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Facilita o lançamento de compras: você digita em kg e o sistema converte para {rotuloBase}.
          </p>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Ligação com o cardápio (opcional)
          </legend>
          <Select
            label="Ingrediente que o cliente vê"
            name="ingrediente"
            value={ingredienteId}
            onChange={(e) => setIngredienteId(e.target.value)}
            error={erros.ingrediente}
            hint={'Permite baixar estoque em "bacon extra" e deixar de baixar em "sem cebola".'}
          >
            <option value="">Nenhum</option>
            {ingredientes
              .filter((i) => i.ativo || i.id === ingredienteId)
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
          </Select>
          <div className="mt-3">
            <Input
              label={`Quanto UM adicional consome (${rotuloBase})`}
              name="porcao"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex.: 30"
              value={porcao}
              onChange={(e) => setPorcao(e.target.value)}
              error={erros.porcao}
              hint="Vazio = o adicional não baixa estoque."
            />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
