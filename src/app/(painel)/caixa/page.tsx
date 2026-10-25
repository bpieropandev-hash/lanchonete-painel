"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Search,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api";
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon size={14} className="text-gray-400" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}

function CaixaContent() {
  const [hoje, setHoje] = useState<FechamentoResponse | null>(null);
  const [relatorio, setRelatorio] = useState<ResumoPeriodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const { funcionario } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const isAdmin = funcionario?.perfil === "ADMIN";

  const fecharForm = useForm<FecharCaixaInput>({
    resolver: zodResolver(fecharCaixaSchema),
  });

  const reabrirForm = useForm<ReabrirCaixaInput>({
    resolver: zodResolver(reabrirCaixaSchema),
  });

  const periodoForm = useForm<PeriodoInput>({
    resolver: zodResolver(periodoSchema),
  });

  const loadHoje = useCallback(async () => {
    try {
      const { data } = await api.get<FechamentoResponse>("/admin/caixa/hoje");
      setHoje(data);
    } catch {
      showToast("Não foi possível carregar o caixa de hoje.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadHoje();
  }, [loadHoje]);

  const paraNumero = (v?: string) =>
    v && v.trim() ? Number(v.replace(",", ".")) : undefined;

  const handleFechar = async (input: FecharCaixaInput, forcar = false) => {
    setFechando(true);
    try {
      const { data } = await api.post<FechamentoResponse>("/admin/caixa/fechar", {
        obs: input.obs || undefined,
        fundoTroco: paraNumero(input.fundoTroco),
        dinheiroConferido: paraNumero(input.dinheiroConferido),
        ...(forcar && { forcar: true }),
      });
      const dif = data.diferencaDinheiro;
      showToast(
        dif && dif !== 0
          ? `Caixa fechado. Diferença no dinheiro: ${formatBRL(dif)}`
          : "Caixa fechado",
        dif && dif !== 0 ? "error" : "success"
      );
      setFecharOpen(false);
      fecharForm.reset();
      loadHoje();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      // 409 com pedidos em andamento: pergunta se quer fechar mesmo assim
      if (status === 409 && msg?.includes("em andamento") && !forcar) {
        if (window.confirm(`${msg}\n\nFechar mesmo assim?`)) {
          return handleFechar(input, true);
        }
      } else {
        showToast(msg || "Não foi possível fechar o caixa.", "error");
      }
    } finally {
      setFechando(false);
    }
  };

  const handleReabrir = async (input: ReabrirCaixaInput) => {
    if (!hoje?.id) return;
    setReabrindo(true);
    try {
      await api.patch(`/admin/caixa/${hoje.id}/reabrir`, {
        motivo: input.motivo,
      });
      showToast("Caixa reaberto. Feche de novo depois de corrigir.", "success");
      setReabrirOpen(false);
      reabrirForm.reset();
      loadHoje();
    } catch {
      showToast("Não foi possível reabrir o caixa.", "error");
    } finally {
      setReabrindo(false);
    }
  };

  const handleBuscarRelatorio = async (input: PeriodoInput) => {
    setLoadingRelatorio(true);
    try {
      const { data } = await api.get<ResumoPeriodo>(
        "/admin/caixa/relatorio/periodo",
        { params: { dataInicio: input.dataInicio, dataFim: input.dataFim } }
      );
      setRelatorio(data);
    } catch {
      showToast("Não foi possível carregar o relatório.", "error");
    } finally {
      setLoadingRelatorio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hoje */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calendar size={20} />
            Caixa do expediente {hoje ? `(${formatData(hoje.data)})` : ""}
          </h2>
          {isAdmin && hoje && !hoje.isFechado && (
            <Button
              variant="danger"
              leftIcon={<Lock size={16} />}
              onClick={() => setFecharOpen(true)}
            >
              {hoje.motivoReabertura ? "Fechar caixa novamente" : "Fechar caixa"}
            </Button>
          )}
          {hoje?.isFechado && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                Fechado {hoje.fechadoEm ? `em ${formatDataHora(hoje.fechadoEm)}` : ""}
              </span>
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Unlock size={14} />}
                  onClick={() => setReabrirOpen(true)}
                >
                  Reabrir
                </Button>
              )}
            </div>
          )}
        </div>

        {hoje?.motivoReabertura && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">
                Caixa foi reaberto
                {hoje.reabertoPor ? ` por ${hoje.reabertoPor.nome}` : ""}
                {hoje.reabertoEm ? ` em ${formatDataHora(hoje.reabertoEm)}` : ""}
              </p>
              <p className="text-xs">
                <strong>Motivo:</strong> {hoje.motivoReabertura}
              </p>
            </div>
          </div>
        )}

        {hoje && !hoje.isFechado && hoje.pedidosEmAndamento > 0 && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {hoje.pedidosEmAndamento} pedido(s) ainda em andamento: só entram no total quando
            forem entregues.
          </div>
        )}

        {hoje?.isFechado && hoje.dinheiroConferido !== null && (
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              hoje.diferencaDinheiro
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-green-200 bg-green-50 text-green-900"
            }`}
          >
            Gaveta: fundo {formatBRL(hoje.fundoTroco)} + vendas em dinheiro{" "}
            {formatBRL(hoje.totalDinheiro)} = esperado{" "}
            {formatBRL(hoje.fundoTroco + hoje.totalDinheiro)} · contado{" "}
            {formatBRL(hoje.dinheiroConferido)} ·{" "}
            <strong>
              {hoje.diferencaDinheiro
                ? `diferença ${formatBRL(hoje.diferencaDinheiro)}`
                : "sem diferença"}
            </strong>
          </div>
        )}

        {hoje ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Total geral"
              value={formatBRL(hoje.totalGeral)}
              icon={DollarSign}
            />
            <StatCard
              label="Total de pedidos"
              value={String(hoje.totalPedidos)}
              icon={TrendingUp}
            />
            <StatCard
              label="Ticket médio"
              value={formatBRL(hoje.ticketMedio)}
              icon={CreditCard}
            />
            <StatCard
              label="Cancelados"
              value={String(hoje.pedidosCancelados)}
              icon={Lock}
            />
            <StatCard
              label="Pix"
              value={formatBRL(hoje.totalPix)}
              icon={Smartphone}
            />
            <StatCard
              label="Dinheiro"
              value={formatBRL(hoje.totalDinheiro)}
              icon={Banknote}
            />
            <StatCard
              label="Cartão"
              value={formatBRL(hoje.totalCartao)}
              icon={CreditCard}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhum dado disponível.</p>
        )}
      </section>

      {/* Relatório por período — ADMIN only */}
      {isAdmin && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Search size={20} />
            Relatório por período
          </h2>

          <form
            onSubmit={periodoForm.handleSubmit(handleBuscarRelatorio)}
            className="mb-4 flex flex-wrap items-end gap-3"
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
              Buscar
            </Button>
          </form>

          {relatorio && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="Total geral"
                  value={formatBRL(relatorio.totalGeral)}
                  icon={DollarSign}
                />
                <StatCard
                  label="Total de pedidos"
                  value={String(relatorio.totalPedidos)}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Ticket médio"
                  value={formatBRL(relatorio.ticketMedio)}
                  icon={CreditCard}
                />
                <StatCard
                  label="Média diária"
                  value={formatBRL(relatorio.mediaDiaria)}
                  icon={Calendar}
                />
                <StatCard
                  label="Pix"
                  value={formatBRL(relatorio.totalPix)}
                  icon={Smartphone}
                />
                <StatCard
                  label="Dinheiro"
                  value={formatBRL(relatorio.totalDinheiro)}
                  icon={Banknote}
                />
                <StatCard
                  label="Cartão"
                  value={formatBRL(relatorio.totalCartao)}
                  icon={CreditCard}
                />
                <StatCard
                  label="Cancelados"
                  value={String(relatorio.totalCancelados)}
                  icon={Lock}
                />
              </div>

              {relatorio.melhorDia && (
                <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
                  <Trophy size={18} className="text-yellow-600" />
                  <span className="text-yellow-900">
                    <strong>Melhor dia:</strong>{" "}
                    {formatData(relatorio.melhorDia.data)} —{" "}
                    {formatBRL(relatorio.melhorDia.total)}
                  </span>
                </div>
              )}

              {relatorio.fechamentos.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Pedidos</th>
                        <th className="px-3 py-2 hidden md:table-cell">
                          Fechado por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {relatorio.fechamentos.map((f, idx) => (
                        <tr key={f.id || idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">
                            {formatData(f.data)}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {formatBRL(f.totalGeral)}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {f.totalPedidos}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-gray-600">
                            {f.fechadoPor?.nome || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Modal Fechar Caixa */}
      <Modal
        open={fecharOpen}
        onClose={() => setFecharOpen(false)}
        title="Fechar caixa de hoje"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setFecharOpen(false)}
              disabled={fechando}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={fecharForm.handleSubmit((input) => handleFechar(input))}
              loading={fechando}
              fullWidth
              leftIcon={<Lock size={16} />}
            >
              Confirmar Fechamento
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-gray-600">
          Após fechar, o caixa deste expediente ficará bloqueado para alterações.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Input
            label="Fundo de troco (R$)"
            inputMode="decimal"
            placeholder="0,00"
            hint="Dinheiro na gaveta ao abrir"
            {...fecharForm.register("fundoTroco")}
            error={fecharForm.formState.errors.fundoTroco?.message}
          />
          <Input
            label="Dinheiro contado (R$)"
            inputMode="decimal"
            placeholder="0,00"
            hint="Total na gaveta agora"
            {...fecharForm.register("dinheiroConferido")}
            error={fecharForm.formState.errors.dinheiroConferido?.message}
          />
        </div>
        {hoje && (
          <p className="mb-3 text-xs text-gray-500">
            Vendas em dinheiro no sistema: {formatBRL(hoje.totalDinheiro)}. A diferença
            entre o contado e o esperado fica registrada.
          </p>
        )}
        <Textarea
          label="Observação (opcional)"
          rows={2}
          placeholder="Ex: sangria de R$ 200 às 22h..."
          {...fecharForm.register("obs")}
        />
      </Modal>

      {/* Modal Reabrir Caixa */}
      <Modal
        open={reabrirOpen}
        onClose={() => setReabrirOpen(false)}
        title="Reabrir caixa"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setReabrirOpen(false)}
              disabled={reabrindo}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={reabrirForm.handleSubmit(handleReabrir)}
              loading={reabrindo}
              fullWidth
              leftIcon={<Unlock size={16} />}
            >
              Confirmar Reabertura
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <p>
            O motivo da reabertura fica registrado no histórico do caixa.
            Use com cautela.
          </p>
        </div>
        <Textarea
          label="Motivo da reabertura *"
          rows={3}
          placeholder="Ex: lançamento de pedido atrasado, correção de valor..."
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
      <PainelShell title="Caixa">
        <CaixaContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
