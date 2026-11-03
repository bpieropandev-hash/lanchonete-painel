"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_ROTULO,
  custoPorUnidadeBase,
  custoPorUnidadeCompra,
  formatarCustoUnitario,
  formatarQuantidade,
  numeroDe,
  validarDecimal,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { Insumo, ResultadoLancamento } from "@/types/estoque";

type Modo = "CONTAGEM" | "VARIACAO" | "CUSTO";

const MOTIVO_PADRAO: Record<Modo, string> = {
  CONTAGEM: "Contagem do estoque",
  VARIACAO: "Correção de saldo",
  CUSTO: "Correção do custo médio",
};

const MODOS: Array<{ id: Modo; titulo: string; ajuda: string }> = [
  { id: "CONTAGEM", titulo: "Contei o estoque", ajuda: "Informe quanto tem de verdade." },
  { id: "VARIACAO", titulo: "Somar ou tirar", ajuda: "Use negativo para tirar (ex.: -50)." },
  { id: "CUSTO", titulo: "Corrigir só o custo", ajuda: "O saldo não muda." },
];

interface AjusteModalProps {
  insumo: Insumo | null;
  onClose: () => void;
  onSaved: (resultado: ResultadoLancamento) => void;
}

/**
 * Ajuste (ADMIN): contagem, correção de saldo, devolução ao estoque e correção
 * do custo médio. O livro nunca é editado: tudo vira um lançamento novo.
 */
export function AjusteModal({ insumo, onClose, onSaved }: AjusteModalProps) {
  const [modo, setModo] = useState<Modo>("CONTAGEM");
  const [quantidade, setQuantidade] = useState("");
  const [custo, setCusto] = useState("");
  const [motivo, setMotivo] = useState(MOTIVO_PADRAO.CONTAGEM);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (insumo) {
      setModo("CONTAGEM");
      setQuantidade("");
      setCusto("");
      setMotivo(MOTIVO_PADRAO.CONTAGEM);
      setErros({});
    }
  }, [insumo]);

  if (!insumo) return null;

  const rotuloBase = UNIDADE_ROTULO[insumo.unidade];
  const fator = numeroDe(insumo.fatorCompra) || 1;
  const unidadeDoCusto = insumo.unidadeCompra || rotuloBase;
  const custoAtualBase = numeroDe(insumo.custoMedio);

  const trocarModo = (novo: Modo) => {
    setModo(novo);
    setMotivo(MOTIVO_PADRAO[novo]);
    setErros({});
  };

  const salvar = async () => {
    const novosErros: Record<string, string> = {};
    const corpo: Record<string, number | string> = {};

    if (modo === "CONTAGEM") {
      const q = validarDecimal(quantidade, {
        rotulo: "Saldo contado",
        casas: 3,
        min: 0,
        max: LIMITES_ESTOQUE.QUANTIDADE,
      });
      if (q.ok) corpo.saldoContado = q.valor;
      else novosErros.quantidade = q.erro;
    } else if (modo === "VARIACAO") {
      const q = validarDecimal(quantidade, {
        rotulo: "Variação",
        casas: 3,
        min: -LIMITES_ESTOQUE.QUANTIDADE,
        max: LIMITES_ESTOQUE.QUANTIDADE,
        permitirNegativo: true,
        naoZero: true,
      });
      if (q.ok) corpo.quantidade = q.valor;
      else novosErros.quantidade = q.erro;
    }

    if (modo === "CUSTO" || custo.trim() !== "") {
      const c = validarDecimal(custo, {
        rotulo: "Custo",
        casas: 6,
        min: 0,
        max: LIMITES_ESTOQUE.CUSTO_UNITARIO * fator,
      });
      if (c.ok) {
        const base = insumo.unidadeCompra ? custoPorUnidadeBase(c.valor, fator) : c.valor;
        if (base > LIMITES_ESTOQUE.CUSTO_UNITARIO) {
          novosErros.custo = "Custo acima do limite permitido";
        } else {
          corpo.custoMedio = base;
        }
      } else {
        novosErros.custo = c.erro;
      }
    }

    if (motivo.trim().length < 3) novosErros.motivo = "Explique o motivo (mínimo 3 letras)";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    corpo.motivo = motivo.trim();

    setEnviando(true);
    try {
      const { data } = await api.post<ResultadoLancamento>(
        `/admin/estoque/insumos/${insumo.id}/ajustes`,
        corpo,
      );
      showToast("Ajuste registrado", "success");
      onSaved(data);
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível registrar o ajuste."), "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ajustar: ${insumo.nome}`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={enviando} fullWidth>
            Registrar ajuste
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
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p>
            Saldo atual: <strong>{formatarQuantidade(insumo.saldo, insumo.unidade)}</strong>
          </p>
          <p>
            Custo médio atual:{" "}
            <strong>
              {custoAtualBase > 0
                ? `${formatarCustoUnitario(custoAtualBase)} por ${rotuloBase}`
                : "ainda sem custo"}
            </strong>
            {custoAtualBase > 0 && insumo.unidadeCompra && (
              <span className="text-gray-500">
                {" "}
                ({formatarCustoUnitario(custoPorUnidadeCompra(custoAtualBase, fator))} por{" "}
                {insumo.unidadeCompra})
              </span>
            )}
          </p>
        </div>

        <div role="radiogroup" aria-label="Tipo de ajuste" className="grid gap-2">
          {MODOS.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${
                modo === m.id ? "border-primary-500 bg-primary-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="modo"
                className="mt-0.5"
                checked={modo === m.id}
                onChange={() => trocarModo(m.id)}
              />
              <span>
                <span className="block font-medium text-gray-900">{m.titulo}</span>
                <span className="block text-xs text-gray-500">{m.ajuda}</span>
              </span>
            </label>
          ))}
        </div>

        {modo !== "CUSTO" && (
          <Input
            label={modo === "CONTAGEM" ? `Saldo contado (${rotuloBase})` : `Quantidade (${rotuloBase})`}
            name="quantidade"
            inputMode="decimal"
            autoComplete="off"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            error={erros.quantidade}
          />
        )}

        <Input
          label={
            modo === "CUSTO"
              ? `Novo custo por ${unidadeDoCusto} (R$)`
              : `Custo por ${unidadeDoCusto} (R$, opcional)`
          }
          name="custo"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          error={erros.custo}
          hint={
            modo === "CUSTO"
              ? "Substitui o custo médio atual. Use para corrigir uma compra digitada errada."
              : "Deixe vazio para manter o custo médio."
          }
        />

        <Input
          label="Motivo"
          name="motivo"
          autoComplete="off"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={erros.motivo}
        />
      </form>
    </Modal>
  );
}
