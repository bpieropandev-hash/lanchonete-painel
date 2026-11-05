"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  UnlockKeyhole,
  Wallet,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
import { distribuicaoPagamentos, lerValorCaixa } from "@/lib/caixa";
import { formatBRL, formatData, formatDataHora } from "@/lib/format";
import {
  fecharCaixaSchema,
  reabrirCaixaSchema,
  periodoSchema,
  type FecharCaixaInput,
  type ReabrirCaixaInput,
  type PeriodoInput,
} from "@/lib/validators";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { FechamentoResponse, ResumoPeriodo } from "@/types";
import { Metric, PaymentRow } from "@/components/caixa/FinanceiroCards";

function CaixaContent() {
  const [hoje, setHoje] = useState<FechamentoResponse | null>(null);
  const [relatorio, setRelatorio] = useState<ResumoPeriodo | null>(null);
  const [aba, setAba] = useState<"resumo" | "historico">("resumo");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [erroHoje, setErroHoje] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [agora, setAgora] = useState(0);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [erroRelatorio, setErroRelatorio] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const requestId = useRef(0);
  const isAdmin = useAuthStore((s) => s.funcionario?.perfil === "ADMIN");
  const showToast = useToastStore((s) => s.show);
  const fecharForm = useForm<FecharCaixaInput>({
    resolver: zodResolver(fecharCaixaSchema),
    defaultValues: { fundoTroco: "", dinheiroConferido: "", obs: "" },
  });
  const reabrirForm = useForm<ReabrirCaixaInput>({
    resolver: zodResolver(reabrirCaixaSchema),
  });
  const periodoForm = useForm<PeriodoInput>({
    resolver: zodResolver(periodoSchema),
  });

  const loadHoje = useCallback(async (silencioso = false) => {
    const id = ++requestId.current;
    if (!silencioso) setUpdating(true);
    try {
      const { data } = await api.get<FechamentoResponse>("/admin/caixa/hoje");
      if (id !== requestId.current) return;
      setHoje(data);
      setErroHoje(false);
      setAtualizadoEm(new Date());
    } catch {
      if (id === requestId.current) setErroHoje(true);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setUpdating(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHoje();
    const currentRequest = requestId;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadHoje(true);
    };
    const timer = window.setInterval(refresh, 15_000);
    const relogio = window.setInterval(() => setAgora(Date.now()), 5_000);
    setAgora(Date.now());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      currentRequest.current++;
      window.clearInterval(timer);
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [loadHoje]);

  const handleFechar = async (input: FecharCaixaInput) => {
    setFechando(true);
    try {
      const { data: atual } =
        await api.get<FechamentoResponse>("/admin/caixa/hoje");
      setHoje(atual);
      if (atual.isFechado)
        throw new Error("Este caixa já foi fechado em outra sessão.");
      if (atual.pedidosEmAndamento)
        throw new Error(
          "Há pedidos em andamento. Finalize ou cancele antes de fechar.",
        );
      if (
        hoje &&
        (atual.totalGeral !== hoje.totalGeral ||
          atual.totalDinheiro !== hoje.totalDinheiro)
      )
        throw new Error(
          "Os valores mudaram. Confira os números atualizados antes de fechar.",
        );
      const { data } = await api.post<FechamentoResponse>(
        "/admin/caixa/fechar",
        {
          obs: input.obs?.trim() || undefined,
          fundoTroco: lerValorCaixa(input.fundoTroco, 100_000),
          dinheiroConferido: lerValorCaixa(input.dinheiroConferido, 1_000_000),
        },
      );
      setFecharOpen(false);
      fecharForm.reset();
      showToast(
        data.diferencaDinheiro
          ? `Caixa fechado com diferença de ${formatBRL(data.diferencaDinheiro)}.`
          : "Caixa fechado e conferido.",
        data.diferencaDinheiro ? "error" : "success",
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : err instanceof Error
          ? err.message
          : undefined;
      showToast(message || "Não foi possível fechar o caixa.", "error");
    } finally {
      setFechando(false);
      void loadHoje();
    }
  };

  const handleReabrir = async (input: ReabrirCaixaInput) => {
    if (!hoje?.id) return;
    setReabrindo(true);
    try {
      await api.patch(`/admin/caixa/${hoje.id}/reabrir`, {
        motivo: input.motivo.trim(),
      });
      setReabrirOpen(false);
      reabrirForm.reset();
      showToast(
        "Caixa reaberto. Confira os valores antes de fechar novamente.",
        "success",
      );
    } catch {
      showToast("Não foi possível reabrir o caixa.", "error");
    } finally {
      setReabrindo(false);
      void loadHoje();
    }
  };

  const buscarRelatorio = async (input: PeriodoInput) => {
    setLoadingRelatorio(true);
    setErroRelatorio(false);
    setRelatorio(null);
    try {
      const { data } = await api.get<ResumoPeriodo>(
        "/admin/caixa/relatorio/periodo",
        { params: { dataInicio: input.dataInicio, dataFim: input.dataFim } },
      );
      setRelatorio(data);
    } catch {
      setErroRelatorio(true);
    } finally {
      setLoadingRelatorio(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-72 items-center justify-center" role="status">
        <LoadingSpinner size="lg" />
        <span className="sr-only">Carregando resumo do caixa</span>
      </div>
    );
  const porcentagens = hoje ? distribuicaoPagamentos(hoje) : [0, 0, 0];
  const horaAtualizacao = atualizadoEm?.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const desatualizado = !erroHoje && atualizadoEm !== null && agora - atualizadoEm.getTime() > 30_000;
  const fundo = lerValorCaixa(fecharForm.watch("fundoTroco"), 100_000);
  const contado = lerValorCaixa(
    fecharForm.watch("dinheiroConferido"),
    1_000_000,
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 sm:space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">
            Visão da operação
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Financeiro do expediente
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <CalendarDays size={15} aria-hidden="true" />
            {hoje
              ? `Expediente de ${formatData(hoje.data)}${hoje.horaCorteExpediente !== undefined ? ` · corte às ${String(hoje.horaCorteExpediente).padStart(2, "0")}h` : ""}`
              : "Resumo indisponível"}
            <span aria-hidden="true">·</span>
            {hoje ? (hoje.isFechado ? "Fechado" : "Em andamento") : "Sem dados"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium ${erroHoje ? "bg-red-50 text-red-800" : desatualizado ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}
          >
            {erroHoje || desatualizado ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {erroHoje
              ? "Atualização indisponível"
              : desatualizado ? `Dados desatualizados · ${horaAtualizacao}` : `Atualizado às ${horaAtualizacao || "—"}`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={updating}
            onClick={() => void loadHoje()}
            leftIcon={
              <RefreshCw size={15} className={updating ? "animate-spin" : ""} />
            }
          >
            Atualizar
          </Button>
        </div>
      </div>
      {erroHoje && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <AlertCircle size={18} className="shrink-0" />
          Não foi possível atualizar. Os números podem estar desatualizados.
        </div>
      )}
      {hoje?.isFechado && Boolean(hoje.divergenciaPosterior) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle size={19} className="shrink-0" />
          <span className="flex-1"><strong>Fechamento precisa de revisão.</strong> O cálculo atual dos pedidos difere do valor fechado em {formatBRL(hoje.divergenciaPosterior ?? 0)}. Confira os pedidos concluídos ou alterados depois do fechamento.</span>
          {isAdmin && <Button variant="secondary" size="sm" onClick={() => setReabrirOpen(true)}>Reabrir para conferir</Button>}
        </div>
      )}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-gray-200"
        aria-label="Seções do financeiro"
      >
        {(
          [
            ["resumo", "Resumo do expediente"],
            ["historico", "Histórico de fechamentos"],
          ] as const
        )
          .filter(([id]) => id === "resumo" || isAdmin)
          .map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              aria-current={aba === id ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${aba === id ? "border-primary-500 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              {label}
            </button>
          ))}
      </nav>
      {aba === "resumo" &&
        (hoje ? (
          <div className="space-y-6">
            <section
              className="rounded-2xl bg-gray-950 p-5 text-white shadow-sm sm:p-7"
              aria-label="Faturamento do expediente"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <TrendingUp size={16} />
                    Vendas dos pedidos entregues
                  </p>
                  <p className="mt-3 break-words text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-none tracking-tight tabular-nums">
                    {formatBRL(hoje.totalGeral)}
                  </p>
                  <p className="mt-3 text-sm text-gray-400">
                    {hoje.totalPedidos}{" "}
                    {hoje.totalPedidos === 1
                      ? "pedido entregue"
                      : "pedidos entregues"}{" "}
                    neste expediente
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 md:min-w-48">
                  <p className="text-xs text-gray-400">Ticket médio</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatBRL(hoje.ticketMedio)}
                  </p>
                </div>
              </div>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                icon={Smartphone}
                label="Vendas via Pix"
                value={formatBRL(hoje.totalPix)}
                note="Forma escolhida nos pedidos"
              />
              <Metric
                icon={Banknote}
                label="Vendas em dinheiro"
                value={formatBRL(hoje.totalDinheiro)}
                note="Base da conferência da gaveta"
              />
              <Metric
                icon={CreditCard}
                label="Vendas no cartão"
                value={formatBRL(hoje.totalCartao)}
                note="Repasse bancário não conferido"
              />
              <Metric
                icon={Clock3}
                label="Pedidos em andamento"
                value={String(hoje.pedidosEmAndamento)}
                note="Ainda não entram nas vendas"
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
              <section
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby="formas-heading"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
                      Composição
                    </p>
                    <h3
                      id="formas-heading"
                      className="mt-1 text-lg font-semibold text-gray-950"
                    >
                      Vendas por forma de pagamento
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Conforme a forma escolhida nos pedidos entregues.
                    </p>
                  </div>
                  <Wallet size={20} className="mt-1 shrink-0 text-gray-400" />
                </div>
                <div className="mt-5 divide-y divide-gray-100">
                  <PaymentRow
                    icon={Smartphone}
                    label="Pix"
                    value={hoje.totalPix}
                    percent={porcentagens[0]}
                    bar="bg-teal-600"
                  />
                  <PaymentRow
                    icon={Banknote}
                    label="Dinheiro"
                    value={hoje.totalDinheiro}
                    percent={porcentagens[1]}
                    bar="bg-emerald-600"
                  />
                  <PaymentRow
                    icon={CreditCard}
                    label="Cartão"
                    value={hoje.totalCartao}
                    percent={porcentagens[2]}
                    bar="bg-primary-500"
                  />
                </div>
                <p className="mt-5 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                  Estes são valores de vendas. O módulo ainda não confere Pix
                  recebido, taxas ou repasses de cartão.
                </p>
              </section>
              <section
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                aria-labelledby="gaveta-heading"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
                  Conferência
                </p>
                <h3
                  id="gaveta-heading"
                  className="mt-1 text-lg font-semibold text-gray-950"
                >
                  Gaveta de dinheiro
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {hoje.isFechado
                    ? "Valores registrados no fechamento."
                    : "Prévia das vendas em espécie."}
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Fundo de troco</span>
                    <strong className="tabular-nums text-gray-900">
                      {hoje.isFechado
                        ? formatBRL(hoje.fundoTroco)
                        : "Informar ao fechar"}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 text-gray-600">
                    <span>Vendas em dinheiro</span>
                    <strong className="tabular-nums text-gray-900">
                      {formatBRL(hoje.totalDinheiro)}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 font-semibold text-gray-950">
                    <span>
                      {hoje.isFechado
                        ? "Esperado na gaveta"
                        : "Prévia sem fundo"}
                    </span>
                    <span className="tabular-nums">
                      {formatBRL(
                        hoje.isFechado
                          ? hoje.fundoTroco + hoje.totalDinheiro
                          : hoje.totalDinheiro,
                      )}
                    </span>
                  </div>
                  {hoje.isFechado && hoje.dinheiroConferido !== null && (
                    <>
                      <div className="flex justify-between gap-3">
                        <span>Contado</span>
                        <strong>{formatBRL(hoje.dinheiroConferido)}</strong>
                      </div>
                      <div
                        className={`flex justify-between rounded-xl px-3 py-2 font-semibold ${hoje.diferencaDinheiro ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}
                      >
                        <span>Diferença</span>
                        <span>{formatBRL(hoje.diferencaDinheiro ?? 0)}</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-5 text-xs leading-5 text-amber-800">
                  Despesas em espécie e sangrias não entram neste cálculo.
                  Confira essas saídas antes de fechar.
                </p>
                {isAdmin && !hoje.isFechado && !erroHoje && (
                  <Button
                    className="mt-5 w-full"
                    onClick={() => setFecharOpen(true)}
                    leftIcon={<LockKeyhole size={16} />}
                  >
                    Conferir e fechar caixa
                  </Button>
                )}
                {hoje.isFechado && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <span className="text-xs text-gray-500">
                      Fechado{" "}
                      {hoje.fechadoEm
                        ? `em ${formatDataHora(hoje.fechadoEm)}`
                        : ""}
                      {hoje.fechadoPor ? ` por ${hoje.fechadoPor.nome}` : ""}
                    </span>
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setReabrirOpen(true)}
                        leftIcon={<UnlockKeyhole size={15} />}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                )}
              </section>
            </div>
            {hoje.motivoReabertura && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Caixa reaberto:</strong> {hoje.motivoReabertura}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertCircle size={19} className="shrink-0" />
                <div>
                  <strong>Sobre este resumo</strong>
                  <p className="mt-1 leading-6">
                    {hoje.isFechado
                      ? hoje.criterioDataVenda === "CRIACAO" || !hoje.criterioDataVenda
                        ? "Este fechamento antigo foi calculado pela data de criação dos pedidos. Pedidos concluídos depois exigem conferência."
                        : "O fechamento guarda os totais daquele momento. Pedidos concluídos depois exigem conferência."
                      : hoje.criterioDataVenda === "ENTREGA"
                        ? "As vendas entram no expediente da entrega. A forma escolhida no pedido ainda não comprova recebimento."
                        : "Esta versão da API agrupa os pedidos pela data de criação. A forma escolhida não comprova recebimento."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                <Wallet size={19} className="shrink-0 text-gray-500" />
                <div>
                  <strong className="text-gray-900">
                    Saldo disponível e despesas
                  </strong>
                  <p className="mt-1 leading-6">
                    Ainda não há despesas, contas bancárias ou conciliação. Este
                    resumo não calcula saldo disponível nem lucro.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <span>
                {hoje.pedidosCancelados} pedido(s) cancelado(s) no expediente.
              </span>
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500"
                  onClick={() => setAba("historico")}
                >
                  Ver histórico <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            Não há dados disponíveis.{" "}
            <button
              type="button"
              className="font-semibold text-primary-700 underline"
              onClick={() => void loadHoje()}
            >
              Tentar novamente
            </button>
          </div>
        ))}
      {aba === "historico" && isAdmin && (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
              Consulta
            </p>
            <h3 className="mt-1 text-xl font-semibold text-gray-950">
              Histórico de fechamentos
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              O total do relatório soma apenas os expedientes fechados.
            </p>
          </div>
          <form
            onSubmit={periodoForm.handleSubmit(buscarRelatorio)}
            className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5"
          >
            <Input
              label="Data inicial"
              type="date"
              {...periodoForm.register("dataInicio")}
              error={periodoForm.formState.errors.dataInicio?.message}
            />
            <Input
              label="Data final"
              type="date"
              {...periodoForm.register("dataFim")}
              error={periodoForm.formState.errors.dataFim?.message}
            />
            <Button
              type="submit"
              loading={loadingRelatorio}
              leftIcon={<Search size={16} />}
            >
              Buscar período
            </Button>
          </form>
          {erroRelatorio && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              Não foi possível carregar o período. Confira as datas e tente
              novamente.
            </div>
          )}
          {relatorio && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={TrendingUp}
                  label="Vendas em dias fechados"
                  value={formatBRL(relatorio.totalGeral)}
                  note="Soma dos fechamentos"
                />
                <Metric
                  icon={Wallet}
                  label="Pedidos entregues"
                  value={String(relatorio.totalPedidos)}
                  note="Em dias fechados"
                />
                <Metric
                  icon={CreditCard}
                  label="Ticket médio"
                  value={formatBRL(relatorio.ticketMedio)}
                  note="Vendas ÷ pedidos"
                />
                <Metric
                  icon={CalendarDays}
                  label="Média diária"
                  value={formatBRL(relatorio.mediaDiaria)}
                  note="Por dia fechado"
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <h4 className="font-semibold text-gray-950">
                    Expedientes no período
                  </h4>
                  <span className="text-xs text-gray-500">
                    {relatorio.fechamentos.length} registro(s)
                  </span>
                </div>
                {relatorio.fechamentos.length ? (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th scope="col" className="px-5 py-3">
                              Expediente
                            </th>
                            <th scope="col" className="px-5 py-3 text-right">
                              Vendas
                            </th>
                            <th scope="col" className="px-5 py-3 text-right">
                              Pedidos
                            </th>
                            <th scope="col" className="px-5 py-3">
                              Situação
                            </th>
                            <th scope="col" className="px-5 py-3">
                              Responsável
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {relatorio.fechamentos.map((f) => (
                            <tr
                              key={f.id || f.data}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-3 font-medium">
                                {formatData(f.data)}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold tabular-nums">
                                {formatBRL(f.totalGeral)}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {f.totalPedidos}
                              </td>
                              <td className="px-5 py-3">
                                {f.isFechado ? "Fechado" : "Reaberto"}
                              </td>
                              <td className="px-5 py-3 text-gray-600">
                                {f.fechadoPor?.nome || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="divide-y divide-gray-100 md:hidden">
                      {relatorio.fechamentos.map((f) => (
                        <div
                          key={f.id || f.data}
                          className="flex items-center justify-between gap-3 px-5 py-4"
                        >
                          <div>
                            <strong>{formatData(f.data)}</strong>
                            <p className="mt-1 text-xs text-gray-500">
                              {f.totalPedidos} pedido(s) ·{" "}
                              {f.isFechado ? "Fechado" : "Reaberto"}
                            </p>
                          </div>
                          <strong className="tabular-nums">
                            {formatBRL(f.totalGeral)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="p-6 text-sm text-gray-500">
                    Nenhum fechamento encontrado.
                  </p>
                )}
              </div>
            </>
          )}
          {!relatorio && !erroRelatorio && !loadingRelatorio && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Escolha as datas para consultar os fechamentos.
            </div>
          )}
        </section>
      )}
      <Modal
        open={fecharOpen}
        onClose={() => setFecharOpen(false)}
        title="Conferir e fechar caixa"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={fechando}
              onClick={() => setFecharOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              loading={fechando}
              onClick={fecharForm.handleSubmit(handleFechar)}
              leftIcon={<LockKeyhole size={16} />}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm leading-6 text-gray-600">
          Conte o dinheiro físico antes de confirmar. O valor ficará registrado
          neste expediente.
        </p>
        {hoje && (
          <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Vendas em dinheiro</span>
              <strong>{formatBRL(hoje.totalDinheiro)}</strong>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Pedidos em andamento</span>
              <strong>{hoje.pedidosEmAndamento}</strong>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <Input
            label="Fundo de troco inicial (R$)"
            inputMode="decimal"
            placeholder="Ex.: 100,00"
            hint="Dinheiro que já estava na gaveta"
            {...fecharForm.register("fundoTroco")}
            error={fecharForm.formState.errors.fundoTroco?.message}
          />
          <Input
            label="Dinheiro contado agora (R$)"
            inputMode="decimal"
            placeholder="Ex.: 350,00"
            hint="Valor físico ao encerrar"
            {...fecharForm.register("dinheiroConferido")}
            error={fecharForm.formState.errors.dinheiroConferido?.message}
          />
        </div>
        {hoje && fundo !== null && contado !== null && (
          <div className="mt-4 rounded-xl border border-gray-200 p-3 text-sm">
            <div className="flex justify-between">
              <span>Esperado sem saídas</span>
              <strong>{formatBRL(fundo + hoje.totalDinheiro)}</strong>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Diferença preliminar</span>
              <strong>{formatBRL(contado - fundo - hoje.totalDinheiro)}</strong>
            </div>
          </div>
        )}
        <div className="my-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            Sangrias e despesas em dinheiro não entram no cálculo. Registre-as
            na observação e confira manualmente.
          </span>
        </div>
        <Textarea
          label="Observação (opcional)"
          rows={2}
          placeholder="Ex.: retirada de R$ 50 para insumos"
          {...fecharForm.register("obs")}
          error={fecharForm.formState.errors.obs?.message}
        />
      </Modal>
      <Modal
        open={reabrirOpen}
        onClose={() => setReabrirOpen(false)}
        title="Reabrir caixa"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={reabrindo}
              onClick={() => setReabrirOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              loading={reabrindo}
              onClick={reabrirForm.handleSubmit(handleReabrir)}
              leftIcon={<UnlockKeyhole size={16} />}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm leading-6 text-gray-600">
          A reabertura e seu motivo ficam registrados no histórico.
        </p>
        <Textarea
          label="Motivo da reabertura"
          rows={3}
          placeholder="Explique o que precisa ser corrigido"
          {...reabrirForm.register("motivo")}
          error={reabrirForm.formState.errors.motivo?.message}
        />
      </Modal>
    </div>
  );
}

export default function CaixaPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Financeiro">
        <CaixaContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
