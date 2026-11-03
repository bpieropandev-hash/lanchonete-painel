"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_ROTULO,
  formatarQuantidade,
  validarDecimal,
} from "@/lib/estoque";
import { useToastStore } from "@/store/toastStore";
import type { Insumo, ResultadoLancamento } from "@/types/estoque";

interface PerdaModalProps {
  insumo: Insumo | null;
  onClose: () => void;
  onSaved: (resultado: ResultadoLancamento) => void;
}

/** Perda: sai estoque (quebra, validade, erro de preparo). O motivo é obrigatório. */
export function PerdaModal({ insumo, onClose, onSaved }: PerdaModalProps) {
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (insumo) {
      setQuantidade("");
      setMotivo("");
      setErros({});
    }
  }, [insumo]);

  if (!insumo) return null;
  const unidade = UNIDADE_ROTULO[insumo.unidade];

  const salvar = async () => {
    const novosErros: Record<string, string> = {};
    const q = validarDecimal(quantidade, {
      rotulo: "Quantidade",
      casas: 3,
      min: 0,
      minExclusivo: true,
      max: LIMITES_ESTOQUE.QUANTIDADE,
    });
    if (!q.ok) novosErros.quantidade = q.erro;
    if (motivo.trim().length < 3) novosErros.motivo = "Explique o motivo (mínimo 3 letras)";
    setErros(novosErros);
    if (!q.ok || Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      const { data } = await api.post<ResultadoLancamento>(
        `/admin/estoque/insumos/${insumo.id}/perdas`,
        { quantidade: q.valor, motivo: motivo.trim() },
      );
      showToast("Perda registrada", "success");
      onSaved(data);
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível registrar a perda."), "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar perda: ${insumo.nome}`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={salvar} loading={enviando} fullWidth>
            Registrar perda
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
        <Input
          label={`Quantidade perdida (${unidade})`}
          name="quantidade"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          error={erros.quantidade}
        />
        <Input
          label="Motivo"
          name="motivo"
          autoComplete="off"
          placeholder="Ex.: caiu no chão, venceu, queimou"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={erros.motivo}
        />
      </form>
    </Modal>
  );
}
