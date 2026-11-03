"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, PackagePlus, PauseCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, mensagemErroApi } from "@/lib/api";
import { formatBRL, formatDataHora } from "@/lib/format";
import { formatarQuantidade } from "@/lib/estoque";
import { useEstoqueStore } from "@/store/estoqueStore";
import { useToastStore } from "@/store/toastStore";
import type {
  FalhaPendente,
  Insumo,
  ResultadoReprocessamento,
  ResumoEstoque,
} from "@/types/estoque";
import { CompraModal } from "./CompraModal";
import { IniciarControleModal } from "./IniciarControleModal";
import { StatusInsumo } from "./StatusInsumo";

function Cartao({
  titulo,
  valor,
  detalhe,
  tom = "neutro",
  testId,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  tom?: "neutro" | "alerta" | "perigo";
  testId?: string;
}) {
  const cor =
    tom === "perigo" ? "text-red-700" : tom === "alerta" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm" data-testid={testId}>
      <p className="text-xs font-medium text-gray-500">{titulo}</p>
      <p className={`mt-1 text-xl font-bold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-gray-500">{detalhe}</p>}
    </div>
  );
}

interface VisaoGeralProps {
  onIrParaAba: (aba: "insumos" | "fichas") => void;
  onMudou: () => void;
  /** Muda quando algo é lançado em outra aba, para a visão geral recarregar. */
  versao: number;
}

/** Visão geral (ADMIN): o que há, o que falta, quanto custou, e o estado da baixa. */
export function VisaoGeral({ onIrParaAba, onMudou, versao }: VisaoGeralProps) {
  const config = useEstoqueStore((s) => s.config);
  const definirConfig = useEstoqueStore((s) => s.definirConfig);
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [falhas, setFalhas] = useState<FalhaPendente[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [comprando, setComprando] = useState<Insumo | null>(null);
  const [pausando, setPausando] = useState(false);
  const [reprocessando, setReprocessando] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);

  const carregar = useCallback(async () => {
    try {
      const [r, f, i] = await Promise.all([
        api.get<ResumoEstoque>("/admin/estoque/resumo"),
        api.get<FalhaPendente[]>("/admin/estoque/falhas"),
        api.get<Insumo[]>("/admin/estoque/insumos"),
      ]);
      setResumo(r.data);
      setFalhas(Array.isArray(f.data) ? f.data : []);
      setInsumos(Array.isArray(i.data) ? i.data : []);
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível carregar a visão geral."), "error");
    } finally {
      setCarregando(false);
    }
  }, [showToast]);

  useEffect(() => {
    void carregar();
  }, [carregar, versao]);

  const pausar = async () => {
    if (
      !window.confirm(
        "Pausar a baixa automática? Os pedidos preparados enquanto estiver pausada nunca serão baixados.",
      )
    )
      return;
    setPausando(true);
    try {
      await definirConfig({ ativo: false });
      showToast("Baixa automática pausada", "success");
      onMudou();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível pausar a baixa."), "error");
    } finally {
      setPausando(false);
    }
  };

  const reprocessar = async (pedidoId: string) => {
    setReprocessando(pedidoId);
    try {
      const { data } = await api.post<ResultadoReprocessamento>(
        `/admin/estoque/pedidos/${pedidoId}/reprocessar`,
      );
      showToast(
        data.registrados > 0
          ? `Baixa refeita: ${data.registrados} lançamento(s)`
          : "Essa baixa já estava registrada",
        "success",
      );
      await carregar();
      onMudou();
    } catch (erro) {
      showToast(mensagemErroApi(erro, "Não foi possível reprocessar a baixa."), "error");
    } finally {
      setReprocessando(null);
    }
  };

  if (carregando || !resumo) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const baixaAtiva = !!config?.ativo;

  return (
    <div className="space-y-4">
      {baixaAtiva ? (
        <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="banner-baixa-ativa">
          <p className="flex items-start gap-2 text-sm text-green-900">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>Baixa automática ligada</strong>
              {config?.inicioEm && <> desde {formatDataHora(config.inicioEm)}</>}. Cada pedido que
              entra em &ldquo;Em preparo&rdquo; baixa o estoque.
            </span>
          </p>
          <Button variant="secondary" size="sm" leftIcon={<PauseCircle size={16} />} onClick={pausar} loading={pausando}>
            Pausar baixa
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="banner-baixa-desligada">
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>A baixa automática está desligada.</strong> O estoque só muda quando você
              lança compras, perdas e ajustes.
            </span>
          </p>
          <Button size="sm" leftIcon={<Play size={16} />} onClick={() => setIniciando(true)}>
            Iniciar controle
          </Button>
        </div>
      )}

      {falhas.length > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-3" data-testid="pedidos-sem-baixa">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-900">
            <AlertTriangle size={16} />
            {falhas.length} {falhas.length === 1 ? "pedido sem baixa" : "pedidos sem baixa"}
          </h2>
          <p className="mt-1 text-xs text-red-800">
            A cozinha não foi afetada, mas o estoque desses pedidos não foi baixado. Reprocesse para
            corrigir.
          </p>
          <ul className="mt-2 divide-y divide-red-100">
            {falhas.map((f) => (
              <li key={f.pedidoId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 text-sm text-red-900">
                  <p className="font-medium">Pedido #{String(f.numero).padStart(3, "0")}</p>
                  <p className="break-words text-xs text-red-700">{f.erro}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reprocessando === f.pedidoId}
                  onClick={() => void reprocessar(f.pedidoId)}
                >
                  Reprocessar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Cartao titulo="Valor em estoque" valor={formatBRL(resumo.valorEmEstoque)} testId="cartao-valor" />
        <Cartao
          titulo="Itens a repor"
          valor={String(resumo.insumos.aRepor)}
          detalhe={`${resumo.insumos.baixo} baixo · ${resumo.insumos.zerado} zerado · ${resumo.insumos.negativo} negativo`}
          tom={resumo.insumos.aRepor > 0 ? "alerta" : "neutro"}
          testId="cartao-repor"
        />
        <Cartao titulo="Compras do mês" valor={formatBRL(resumo.mes.compras)} testId="cartao-compras" />
        <Cartao titulo="Consumido no mês (CMV)" valor={formatBRL(resumo.mes.cmv)} testId="cartao-cmv" />
        <Cartao titulo="Perdas do mês" valor={formatBRL(resumo.mes.perdas)} testId="cartao-perdas" />
        <Cartao
          titulo="Lanches sem ficha"
          valor={`${resumo.lanches.semFicha} de ${resumo.lanches.total}`}
          detalhe={resumo.lanches.semEstoque > 0 ? `${resumo.lanches.semEstoque} sem estoque` : undefined}
          tom={resumo.lanches.semFicha > 0 ? "alerta" : "neutro"}
          testId="cartao-sem-ficha"
        />
      </div>

      {resumo.lanches.semFicha > 0 && (
        <button
          className="text-sm font-semibold text-primary-700 underline"
          onClick={() => onIrParaAba("fichas")}
        >
          Montar as fichas que faltam
        </button>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">O que falta</h2>
        {resumo.faltando.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500 shadow-sm">
            {resumo.insumos.ativos === 0
              ? "Nenhum insumo cadastrado ainda."
              : "Nada em falta. Todos os insumos estão acima do mínimo."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-testid="lista-falta">
            {resumo.faltando.map((i) => {
              const completo = insumoPorId.get(i.id);
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-gray-900">{i.nome}</p>
                    <p className="text-xs text-gray-500">
                      Saldo {formatarQuantidade(i.saldo, i.unidade)} · mínimo{" "}
                      {formatarQuantidade(i.estoqueMinimo, i.unidade)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusInsumo status={i.status} />
                    {completo && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<PackagePlus size={16} />}
                        onClick={() => setComprando(completo)}
                      >
                        Compra
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <IniciarControleModal
        open={iniciando}
        onClose={() => setIniciando(false)}
        onIniciado={() => {
          void carregar();
          onMudou();
        }}
        onIrParaAba={onIrParaAba}
      />
      <CompraModal
        insumo={comprando}
        verCustos
        onClose={() => setComprando(null)}
        onSaved={() => {
          void carregar();
          onMudou();
        }}
      />
    </div>
  );
}
