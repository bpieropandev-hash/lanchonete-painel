"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, mensagemErroApi } from "@/lib/api";
import {
  LIMITES_ESTOQUE,
  UNIDADE_ROTULO,
  custoPorUnidadeBase,
  custoPorUnidadeCompra,
  formatarNumero,
  numeroDe,
  validarDecimal,
} from "@/lib/estoque";
import { useEstoqueStore } from "@/store/estoqueStore";
import { useToastStore } from "@/store/toastStore";
import type { FichaApresentacao, Insumo } from "@/types/estoque";

function Passo({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
      ) : (
        <Circle size={18} className="mt-0.5 shrink-0 text-gray-400" />
      )}
      <span className={ok ? "text-gray-700" : "text-gray-900"}>{children}</span>
    </li>
  );
}

interface Contagem {
  saldo: string;
  custo: string;
}

interface IniciarControleModalProps {
  open: boolean;
  onClose: () => void;
  /** Depois de ligar a baixa. */
  onIniciado: () => void;
  /** Leva o usuário à aba que falta preencher. */
  onIrParaAba: (aba: "insumos" | "fichas") => void;
}

/**
 * Assistente para ligar a baixa automática (R10): confere que há insumos e
 * fichas, pede a contagem inicial de cada insumo e só então liga. A contagem
 * é gravada como um ajuste por insumo, com o saldo contado e o custo.
 */
export function IniciarControleModal({
  open,
  onClose,
  onIniciado,
  onIrParaAba,
}: IniciarControleModalProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fichas, setFichas] = useState<FichaApresentacao[]>([]);
  const [contagem, setContagem] = useState<Record<string, Contagem>>({});
  const [erros, setErros] = useState<Record<string, { saldo?: string; custo?: string }>>({});
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const definirConfig = useEstoqueStore((s) => s.definirConfig);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setCarregando(true);
    setErros({});
    setProgresso(null);
    Promise.all([
      api.get<Insumo[]>("/admin/estoque/insumos"),
      api.get<FichaApresentacao[]>("/admin/estoque/fichas"),
    ])
      .then(([i, f]) => {
        if (cancelado) return;
        const lista = Array.isArray(i.data) ? i.data : [];
        setInsumos(lista);
        setFichas(Array.isArray(f.data) ? f.data : []);
        setContagem(
          Object.fromEntries(
            lista.map((ins) => {
              const custoBase = numeroDe(ins.custoMedio);
              const custo =
                custoBase > 0
                  ? formatarNumero(
                      ins.unidadeCompra
                        ? custoPorUnidadeCompra(custoBase, numeroDe(ins.fatorCompra) || 1)
                        : custoBase,
                      6,
                    )
                  : "";
              return [ins.id, { saldo: formatarNumero(ins.saldo), custo }];
            }),
          ),
        );
      })
      .catch((erro) => {
        if (!cancelado) {
          showToast(mensagemErroApi(erro, "Não foi possível carregar os dados."), "error");
          onClose();
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [open, onClose, showToast]);

  const comFicha = useMemo(() => fichas.filter((f) => !f.semFicha).length, [fichas]);
  const temInsumos = insumos.length > 0;
  const temFichas = comFicha > 0;
  const pronto = temInsumos && temFichas;
  const enviando = progresso !== null;

  const iniciar = async () => {
    const novosErros: Record<string, { saldo?: string; custo?: string }> = {};
    const lancamentos: Array<{ insumo: Insumo; corpo: Record<string, number | string> }> = [];
    for (const ins of insumos) {
      const c = contagem[ins.id] ?? { saldo: "", custo: "" };
      const saldo = validarDecimal(c.saldo, {
        rotulo: "Saldo",
        casas: 3,
        min: 0,
        max: LIMITES_ESTOQUE.QUANTIDADE,
      });
      const corpo: Record<string, number | string> = { motivo: "Contagem inicial" };
      if (saldo.ok) corpo.saldoContado = saldo.valor;
      else novosErros[ins.id] = { ...novosErros[ins.id], saldo: saldo.erro };

      if (c.custo.trim() !== "") {
        const custo = validarDecimal(c.custo, {
          rotulo: "Custo",
          casas: 6,
          min: 0,
          max: LIMITES_ESTOQUE.CUSTO_UNITARIO * (numeroDe(ins.fatorCompra) || 1),
        });
        if (custo.ok) {
          corpo.custoMedio = ins.unidadeCompra
            ? custoPorUnidadeBase(custo.valor, numeroDe(ins.fatorCompra) || 1)
            : custo.valor;
        } else {
          novosErros[ins.id] = { ...novosErros[ins.id], custo: custo.erro };
        }
      }
      lancamentos.push({ insumo: ins, corpo });
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      showToast("Corrija os campos destacados.", "error");
      return;
    }

    setProgresso({ feito: 0, total: lancamentos.length });
    try {
      for (const [indice, l] of lancamentos.entries()) {
        await api.post(`/admin/estoque/insumos/${l.insumo.id}/ajustes`, l.corpo);
        setProgresso({ feito: indice + 1, total: lancamentos.length });
      }
      await definirConfig({ ativo: true });
      showToast("Controle de estoque iniciado", "success");
      onIniciado();
      onClose();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível iniciar o controle."), "error");
    } finally {
      setProgresso(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={enviando ? () => undefined : onClose}
      title="Iniciar controle de estoque"
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={iniciar} loading={enviando} disabled={!pronto || carregando} fullWidth>
            {enviando && progresso
              ? `Registrando ${progresso.feito}/${progresso.total}…`
              : "Iniciar controle"}
          </Button>
        </div>
      }
    >
      {carregando ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Daqui em diante, cada pedido que entra em <strong>Em preparo</strong> baixa o estoque
            conforme a ficha técnica. Pedidos anteriores não são baixados.
          </p>

          <ul className="space-y-2 rounded-lg bg-gray-50 p-3">
            <Passo ok={temInsumos}>
              Insumos cadastrados: <strong>{insumos.length}</strong>
              {!temInsumos && (
                <>
                  {" "}
                  <button className="font-semibold text-primary-700 underline" onClick={() => { onClose(); onIrParaAba("insumos"); }}>
                    Cadastrar insumos
                  </button>
                </>
              )}
            </Passo>
            <Passo ok={temFichas}>
              Lanches com ficha técnica: <strong>{comFicha}</strong>
              {!temFichas && (
                <>
                  {" "}
                  <button className="font-semibold text-primary-700 underline" onClick={() => { onClose(); onIrParaAba("fichas"); }}>
                    Montar fichas
                  </button>
                </>
              )}
            </Passo>
            <Passo ok={false}>Contagem inicial de cada insumo (abaixo)</Passo>
          </ul>

          {pronto && (
            <>
              <p className="text-sm text-gray-600">
                Conte o que há no estoque agora. O custo é opcional, mas sem ele o custo e a margem
                dos lanches ficam incompletos.
              </p>
              <ul className="space-y-3">
                {insumos.map((ins) => {
                  const c = contagem[ins.id] ?? { saldo: "", custo: "" };
                  const unidadeCusto = ins.unidadeCompra || UNIDADE_ROTULO[ins.unidade];
                  return (
                    <li key={ins.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="mb-2 text-sm font-medium text-gray-900">{ins.nome}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label={`Saldo contado (${UNIDADE_ROTULO[ins.unidade]})`}
                          aria-label={`Saldo contado de ${ins.nome}`}
                          inputMode="decimal"
                          autoComplete="off"
                          value={c.saldo}
                          onChange={(e) =>
                            setContagem((prev) => ({ ...prev, [ins.id]: { ...c, saldo: e.target.value } }))
                          }
                          error={erros[ins.id]?.saldo}
                        />
                        <Input
                          label={`Custo por ${unidadeCusto} (R$)`}
                          aria-label={`Custo de ${ins.nome}`}
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="opcional"
                          value={c.custo}
                          onChange={(e) =>
                            setContagem((prev) => ({ ...prev, [ins.id]: { ...c, custo: e.target.value } }))
                          }
                          error={erros[ins.id]?.custo}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
