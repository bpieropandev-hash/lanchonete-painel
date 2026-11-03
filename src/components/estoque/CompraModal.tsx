"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_ROTULO,
  converterParaBase,
  formatarCustoUnitario,
  formatarNumero,
  formatarQuantidade,
  numeroDe,
  previaDaCompra,
  validarDecimal,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { Insumo, ResultadoLancamento } from "@/types/estoque";

interface CompraModalProps {
  insumo: Insumo | null;
  /** ADMIN vê o preço por unidade e o novo custo médio; ATENDENTE nunca vê custos. */
  verCustos: boolean;
  onClose: () => void;
  onSaved: (resultado: ResultadoLancamento) => void;
}

/** Compra: entra estoque e o servidor recalcula o custo médio ponderado. */
export function CompraModal({ insumo, verCustos, onClose, onSaved }: CompraModalProps) {
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<"BASE" | "COMPRA">("BASE");
  const [valor, setValor] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (insumo) {
      setQuantidade("");
      setValor("");
      setFornecedor("");
      setMotivo("");
      setErros({});
      setUnidade(insumo.unidadeCompra ? "COMPRA" : "BASE");
    }
  }, [insumo]);

  if (!insumo) return null;

  const rotuloBase = UNIDADE_ROTULO[insumo.unidade];
  const fator = numeroDe(insumo.fatorCompra) || 1;
  const usaCompra = unidade === "COMPRA" && !!insumo.unidadeCompra;

  const campoQuantidade = validarDecimal(quantidade, {
    rotulo: "Quantidade",
    casas: 3,
    min: 0,
    minExclusivo: true,
    max: LIMITES_ESTOQUE.QUANTIDADE,
  });
  const campoValor = validarDecimal(valor, {
    rotulo: "Valor pago",
    casas: 2,
    min: 0,
    max: LIMITES_ESTOQUE.VALOR_TOTAL,
  });

  const quantidadeBase = campoQuantidade.ok
    ? converterParaBase(campoQuantidade.valor, usaCompra, fator)
    : null;
  const previa =
    verCustos && quantidadeBase && quantidadeBase > 0 && campoValor.ok
      ? previaDaCompra({
          saldo: numeroDe(insumo.saldo),
          custoMedio: numeroDe(insumo.custoMedio),
          quantidadeBase,
          valorTotal: campoValor.valor,
        })
      : null;

  const salvar = async () => {
    const novosErros: Record<string, string> = {};
    if (!campoQuantidade.ok) novosErros.quantidade = campoQuantidade.erro;
    if (!campoValor.ok) novosErros.valor = campoValor.erro;
    setErros(novosErros);
    if (!campoQuantidade.ok || !campoValor.ok) return;

    setEnviando(true);
    try {
      const { data } = await api.post<ResultadoLancamento>(
        `/admin/estoque/insumos/${insumo.id}/compras`,
        {
          quantidade: campoQuantidade.valor,
          ...(insumo.unidadeCompra ? { unidade } : {}),
          valorTotal: campoValor.valor,
          ...(fornecedor.trim() ? { fornecedor: fornecedor.trim() } : {}),
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        },
      );
      showToast("Compra registrada", "success");
      onSaved(data);
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível registrar a compra."), "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar compra: ${insumo.nome}`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={enviando} fullWidth>
            Registrar compra
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
        <p className="text-sm text-gray-600">
          Saldo atual: <strong>{formatarQuantidade(insumo.saldo, insumo.unidade)}</strong>
        </p>

        <div className={insumo.unidadeCompra ? "grid grid-cols-2 gap-3" : ""}>
          <Input
            label="Quantidade comprada"
            name="quantidade"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            error={erros.quantidade}
          />
          {insumo.unidadeCompra && (
            <Select
              label="Unidade"
              name="unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as "BASE" | "COMPRA")}
            >
              <option value="COMPRA">
                {insumo.unidadeCompra} (= {formatarNumero(fator)} {rotuloBase})
              </option>
              <option value="BASE">{rotuloBase}</option>
            </Select>
          )}
        </div>

        <Input
          label="Valor total pago (R$)"
          name="valor"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          error={erros.valor}
        />

        {quantidadeBase !== null && quantidadeBase > 0 && (
          <div
            className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700"
            data-testid="previa-compra"
          >
            <p>
              Entram <strong>{formatarNumero(quantidadeBase)} {rotuloBase}</strong> no estoque.
            </p>
            {previa && (
              <>
                <p className="mt-1">
                  Você pagou {formatarCustoUnitario(previa.precoPorUnidadeBase)} por {rotuloBase}.
                </p>
                <p>
                  Novo custo médio:{" "}
                  <strong>
                    {formatarCustoUnitario(previa.novoCustoMedio)} por {rotuloBase}
                  </strong>{" "}
                  <span className="text-xs text-gray-500">(estimado)</span>
                </p>
              </>
            )}
          </div>
        )}

        <Input
          label="Fornecedor (opcional)"
          name="fornecedor"
          autoComplete="off"
          maxLength={100}
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
        />
        <Input
          label="Observação (opcional)"
          name="motivo"
          autoComplete="off"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </form>
    </Modal>
  );
}
