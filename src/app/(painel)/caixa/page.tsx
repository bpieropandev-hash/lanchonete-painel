"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DollarSign,
  Lock,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Search,
  Trophy,
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
  periodoSchema,
  type FecharCaixaInput,
  type PeriodoInput,
} from "@/lib/validators";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { FechamentoResponse, ResumoPeriodo } from "@/types";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
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
  const { funcionario } = useAuthStore();
  const showToast = useToastStore((s) => s.show);
  const isAdmin = funcionario?.perfil === "ADMIN";

  const fecharForm = useForm<FecharCaixaInput>({
    resolver: zodResolver(fecharCaixaSchema),
  });

  const periodoForm = useForm<PeriodoInput>({
    resolver: zodResolver(periodoSchema),
  });

  const loadHoje = useCallback(async () => {
    try {
      const { data } = await api.get<FechamentoResponse>("/admin/caixa/hoje");
      setHoje(data);
    } catch {
      showToast("Erro ao carregar caixa de hoje", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadHoje();
  }, [loadHoje]);

  const handleFechar = async (input: FecharCaixaInput) => {
    setFechando(true);
    try {
      await api.post("/admin/caixa/fechar", { obs: input.obs || undefined });
      showToast("Caixa fechado com sucesso", "success");
      setFecharOpen(false);
      fecharForm.reset();
      loadHoje();
    } catch {
      showToast("Erro ao fechar caixa", "error");
    } finally {
      setFechando(false);
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
      showToast("Erro ao buscar relatório", "error");
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
            Caixa de Hoje
          </h2>
          {isAdmin && hoje && !hoje.isFechado && (
            <Button
              variant="danger"
              leftIcon={<Lock size={16} />}
              onClick={() => setFecharOpen(true)}
            >
              Fechar Caixa
            </Button>
          )}
          {hoje?.isFechado && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              Fechado {hoje.fechadoEm ? `em ${formatDataHora(hoje.fechadoEm)}` : ""}
            </span>
          )}
        </div>

        {hoje ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Total Geral"
              value={formatBRL(hoje.totalGeral)}
              icon={DollarSign}
              accent="bg-primary-500"
            />
            <StatCard
              label="Total Pedidos"
              value={String(hoje.totalPedidos)}
              icon={TrendingUp}
              accent="bg-blue-500"
            />
            <StatCard
              label="Ticket Médio"
              value={formatBRL(hoje.ticketMedio)}
              icon={CreditCard}
              accent="bg-purple-500"
            />
            <StatCard
              label="Cancelados"
              value={String(hoje.pedidosCancelados)}
              icon={Lock}
              accent="bg-red-500"
            />
            <StatCard
              label="PIX"
              value={formatBRL(hoje.totalPix)}
              icon={Smartphone}
              accent="bg-green-500"
            />
            <StatCard
              label="Dinheiro"
              value={formatBRL(hoje.totalDinheiro)}
              icon={Banknote}
              accent="bg-yellow-500"
            />
            <StatCard
              label="Cartão"
              value={formatBRL(hoje.totalCartao)}
              icon={CreditCard}
              accent="bg-indigo-500"
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
            Relatório por Período
          </h2>

          <form
            onSubmit={periodoForm.handleSubmit(handleBuscarRelatorio)}
            className="mb-4 flex flex-wrap items-end gap-3"
          >
            <Input
              label="Data Início"
              type="date"
              {...periodoForm.register("dataInicio")}
              error={periodoForm.formState.errors.dataInicio?.message}
            />
            <Input
              label="Data Fim"
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
                  label="Total Geral"
                  value={formatBRL(relatorio.totalGeral)}
                  icon={DollarSign}
                  accent="bg-primary-500"
                />
                <StatCard
                  label="Total Pedidos"
                  value={String(relatorio.totalPedidos)}
                  icon={TrendingUp}
                  accent="bg-blue-500"
                />
                <StatCard
                  label="Ticket Médio"
                  value={formatBRL(relatorio.ticketMedio)}
                  icon={CreditCard}
                  accent="bg-purple-500"
                />
                <StatCard
                  label="Média Diária"
                  value={formatBRL(relatorio.mediaDiaria)}
                  icon={Calendar}
                  accent="bg-teal-500"
                />
                <StatCard
                  label="PIX"
                  value={formatBRL(relatorio.totalPix)}
                  icon={Smartphone}
                  accent="bg-green-500"
                />
                <StatCard
                  label="Dinheiro"
                  value={formatBRL(relatorio.totalDinheiro)}
                  icon={Banknote}
                  accent="bg-yellow-500"
                />
                <StatCard
                  label="Cartão"
                  value={formatBRL(relatorio.totalCartao)}
                  icon={CreditCard}
                  accent="bg-indigo-500"
                />
                <StatCard
                  label="Cancelados"
                  value={String(relatorio.totalCancelados)}
                  icon={Lock}
                  accent="bg-red-500"
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
                          <td className="px-3 py-2 font-semibold text-primary-600">
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
        title="Fechar Caixa de Hoje"
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
              onClick={fecharForm.handleSubmit(handleFechar)}
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
          Após fechar, o caixa de hoje ficará bloqueado para alterações.
        </p>
        <Textarea
          label="Observação (opcional)"
          rows={3}
          placeholder="Ex: caixa conferido com R$ X..."
          {...fecharForm.register("obs")}
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
