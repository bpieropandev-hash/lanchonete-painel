"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock, MapPin, Plus, Power, Save, Store, Trash2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ControleMovimento } from "@/components/loja/ControleMovimento";
import { api } from "@/lib/api";
import { formatBRL, formatDataHora } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type {
  BairroEntrega,
  ConfiguracaoLoja,
  FaixaHorario,
  ModoFuncionamento,
} from "@/types";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Exibe começando pela segunda-feira
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function erroApi(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}

interface FormConfig {
  horarios: FaixaHorario[];
  mensagemFechada: string;
  pedidoMinimo: string;
  taxaEntregaPadrao: string;
  entregaApenasBairrosCadastrados: boolean;
  aceitaEntrega: boolean;
  aceitaRetirada: boolean;
  tempoEstimadoEntregaMin: string;
  tempoEstimadoRetiradaMin: string;
  whatsappLoja: string;
  cashbackPercentual: string;
  cashbackValidadeDias: string;
}

function paraForm(c: ConfiguracaoLoja): FormConfig {
  return {
    horarios: c.horarios,
    mensagemFechada: c.mensagemFechada ?? "",
    pedidoMinimo: String(c.pedidoMinimo),
    taxaEntregaPadrao: String(c.taxaEntregaPadrao),
    entregaApenasBairrosCadastrados: c.entregaApenasBairrosCadastrados,
    aceitaEntrega: c.aceitaEntrega,
    aceitaRetirada: c.aceitaRetirada,
    tempoEstimadoEntregaMin: String(c.tempoEstimadoEntregaMin),
    tempoEstimadoRetiradaMin: String(c.tempoEstimadoRetiradaMin),
    whatsappLoja: c.whatsappLoja ?? "",
    cashbackPercentual: String(c.cashbackPercentual ?? 0),
    cashbackValidadeDias: String(c.cashbackValidadeDias ?? 60),
  };
}

const numero = (v: string) => Number(v.replace(",", "."));

function LojaContent() {
  const { funcionario } = useAuthStore();
  const isAdmin = funcionario?.perfil === "ADMIN";
  const showToast = useToastStore((s) => s.show);

  const [config, setConfig] = useState<ConfiguracaoLoja | null>(null);
  const [form, setForm] = useState<FormConfig | null>(null);
  const [bairros, setBairros] = useState<BairroEntrega[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [mudandoModo, setMudandoModo] = useState(false);
  const [novoBairro, setNovoBairro] = useState({ nome: "", taxa: "" });

  const carregar = useCallback(async () => {
    try {
      const [{ data: cfg }, { data: lista }] = await Promise.all([
        api.get<ConfiguracaoLoja>("/admin/loja/configuracao"),
        api.get<BairroEntrega[]>("/admin/loja/bairros"),
      ]);
      setConfig(cfg);
      setForm(paraForm(cfg));
      setBairros(lista);
    } catch (err) {
      showToast(erroApi(err, "Não foi possível carregar a configuração da loja."), "error");
    }
  }, [showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alterarModo = async (modo: ModoFuncionamento) => {
    setMudandoModo(true);
    try {
      const { data } = await api.patch<ConfiguracaoLoja>("/admin/loja/modo", {
        modoFuncionamento: modo,
      });
      setConfig(data);
      showToast(data.aberta ? "Loja aberta para pedidos" : "Loja fechada para pedidos", "success");
    } catch (err) {
      showToast(erroApi(err, "Não foi possível alterar a loja."), "error");
    } finally {
      setMudandoModo(false);
    }
  };

  const salvar = async () => {
    if (!form) return;
    const faixaInvalida = form.horarios.find((h) => !h.abre || !h.fecha);
    if (faixaInvalida) {
      showToast(`Preencha abertura e fechamento de ${DIAS[faixaInvalida.dia]}`, "error");
      return;
    }
    setSalvando(true);
    try {
      const { data } = await api.put<ConfiguracaoLoja>("/admin/loja/configuracao", {
        horarios: form.horarios,
        mensagemFechada: form.mensagemFechada.trim() || null,
        pedidoMinimo: numero(form.pedidoMinimo) || 0,
        taxaEntregaPadrao: numero(form.taxaEntregaPadrao) || 0,
        entregaApenasBairrosCadastrados: form.entregaApenasBairrosCadastrados,
        aceitaEntrega: form.aceitaEntrega,
        aceitaRetirada: form.aceitaRetirada,
        tempoEstimadoEntregaMin: parseInt(form.tempoEstimadoEntregaMin, 10) || 45,
        tempoEstimadoRetiradaMin: parseInt(form.tempoEstimadoRetiradaMin, 10) || 25,
        whatsappLoja: form.whatsappLoja.trim() || null,
        cashbackPercentual: Math.min(30, Math.max(0, numero(form.cashbackPercentual) || 0)),
        cashbackValidadeDias: parseInt(form.cashbackValidadeDias, 10) || 60,
      });
      setConfig(data);
      setForm(paraForm(data));
      showToast("Configuração salva", "success");
    } catch (err) {
      showToast(erroApi(err, "Não foi possível salvar."), "error");
    } finally {
      setSalvando(false);
    }
  };

  const atualizarFaixa = (indice: number, campo: "abre" | "fecha", valor: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            horarios: f.horarios.map((h, i) => (i === indice ? { ...h, [campo]: valor } : h)),
          }
        : f
    );

  const adicionarFaixa = (dia: number) =>
    setForm((f) =>
      f ? { ...f, horarios: [...f.horarios, { dia, abre: "18:00", fecha: "23:00" }] } : f
    );

  const removerFaixa = (indice: number) =>
    setForm((f) => (f ? { ...f, horarios: f.horarios.filter((_, i) => i !== indice) } : f));

  const criarBairro = async () => {
    if (!novoBairro.nome.trim()) return;
    try {
      const { data } = await api.post<BairroEntrega>("/admin/loja/bairros", {
        nome: novoBairro.nome.trim(),
        taxa: numero(novoBairro.taxa) || 0,
      });
      setBairros((b) => [...b, data].sort((x, y) => x.nome.localeCompare(y.nome)));
      setNovoBairro({ nome: "", taxa: "" });
    } catch (err) {
      showToast(erroApi(err, "Não foi possível cadastrar o bairro."), "error");
    }
  };

  const atualizarBairro = async (bairro: BairroEntrega, mudancas: Partial<BairroEntrega>) => {
    try {
      const { data } = await api.patch<BairroEntrega>(
        `/admin/loja/bairros/${bairro.id}`,
        {
          ...(mudancas.taxa !== undefined && { taxa: Number(mudancas.taxa) }),
          ...(mudancas.ativo !== undefined && { ativo: mudancas.ativo }),
        }
      );
      setBairros((b) => b.map((x) => (x.id === data.id ? data : x)));
    } catch (err) {
      showToast(erroApi(err, "Não foi possível atualizar o bairro."), "error");
    }
  };

  const removerBairro = async (bairro: BairroEntrega) => {
    if (!window.confirm(`Remover o bairro ${bairro.nome}?`)) return;
    try {
      await api.delete(`/admin/loja/bairros/${bairro.id}`);
      setBairros((b) => b.filter((x) => x.id !== bairro.id));
    } catch (err) {
      showToast(erroApi(err, "Não foi possível remover o bairro."), "error");
    }
  };

  if (!config || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const MODOS: { modo: ModoFuncionamento; label: string; desc: string }[] = [
    { modo: "AUTO", label: "Seguir horário", desc: "Abre e fecha sozinha pela grade abaixo" },
    { modo: "ABERTA", label: "Abrir agora", desc: "Aceita pedidos até alguém mudar" },
    { modo: "FECHADA", label: "Fechar agora", desc: "Pausa pedidos (cozinha cheia, imprevisto)" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {!config.whatsappLoja && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>WhatsApp da loja não configurado.</strong> Pedidos sem cadastro e de clientes
          novos precisam ser confirmados por ele: enquanto estiver vazio, esses pedidos são
          recusados. {isAdmin ? "Preencha em “Pedidos e entrega” abaixo." : "Avise o administrador."}
        </div>
      )}
      {/* Status */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                config.aberta ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              <Power size={24} />
            </span>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {config.aberta ? "Aberta para pedidos" : "Fechada para pedidos"}
              </p>
              <p className="text-sm text-gray-500">
                {config.modoFuncionamento === "AUTO"
                  ? "Seguindo o horário de funcionamento"
                  : "Forçado manualmente: não segue o horário"}
                {!config.aberta && config.proximaAbertura &&
                  ` · abre ${formatDataHora(config.proximaAbertura)}`}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {MODOS.map(({ modo, label, desc }) => {
            const ativo = config.modoFuncionamento === modo;
            return (
              <button
                key={modo}
                type="button"
                disabled={mudandoModo || ativo}
                onClick={() => alterarModo(modo)}
                aria-pressed={ativo}
                className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-default ${
                  ativo
                    ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                    : "border-gray-200 hover:border-primary-300"
                }`}
              >
                <span className="block text-sm font-bold text-gray-900">{label}</span>
                <span className="block text-xs text-gray-500">{desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Horários */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
          <Clock size={18} /> Horário de funcionamento
        </h2>
        {form.horarios.length === 0 && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <strong>Nenhum horário cadastrado.</strong>{" "}
            {isAdmin
              ? "Use “+ horário” em cada dia que a loja abre e clique em Salvar. Até lá, no modo “Seguir horário”, a loja fica fechada para pedidos."
              : "Peça ao administrador para cadastrar. Até lá, a loja só abre pelo botão “Abrir agora”."}
          </div>
        )}
        <p className="mb-4 text-xs text-gray-500">
          Se o fechamento for antes da abertura (ex.: 18:00 às 01:00), a loja fica aberta até a
          madrugada do dia seguinte.
        </p>
        <div className="divide-y divide-gray-100">
          {ORDEM_DIAS.map((dia) => {
            const faixas = form.horarios
              .map((h, indice) => ({ ...h, indice }))
              .filter((h) => h.dia === dia);
            return (
              <div key={dia} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-20 text-sm font-semibold text-gray-700">{DIAS[dia]}</span>
                {faixas.length === 0 && <span className="text-sm text-gray-400">Fechado</span>}
                {faixas.map((f) => (
                  <span key={f.indice} className="flex items-center gap-1">
                    <input
                      type="time"
                      aria-label={`${DIAS[dia]}: abre`}
                      value={f.abre}
                      disabled={!isAdmin}
                      onChange={(e) => atualizarFaixa(f.indice, "abre", e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">às</span>
                    <input
                      type="time"
                      aria-label={`${DIAS[dia]}: fecha`}
                      value={f.fecha}
                      disabled={!isAdmin}
                      onChange={(e) => atualizarFaixa(f.indice, "fecha", e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => removerFaixa(f.indice)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover horário de ${DIAS[dia]}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                ))}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => adicionarFaixa(dia)}
                    className="ml-auto flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                  >
                    <Plus size={12} /> horário
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pedidos e entrega */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
          <Store size={18} /> Pedidos e entrega
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Pedido mínimo (R$)"
            name="pedidoMinimo"
            inputMode="decimal"
            value={form.pedidoMinimo}
            disabled={!isAdmin}
            hint="Sobre o subtotal, sem a taxa de entrega. 0 = sem mínimo."
            onChange={(e) => setForm({ ...form, pedidoMinimo: e.target.value })}
          />
          <Input
            label="Taxa de entrega padrão (R$)"
            name="taxaEntregaPadrao"
            inputMode="decimal"
            value={form.taxaEntregaPadrao}
            disabled={!isAdmin}
            hint="Usada para bairros que não estão na lista abaixo."
            onChange={(e) => setForm({ ...form, taxaEntregaPadrao: e.target.value })}
          />
          <Input
            label="WhatsApp da loja (com DDD)"
            name="whatsappLoja"
            inputMode="tel"
            placeholder="(31) 99999-9999"
            value={form.whatsappLoja}
            disabled={!isAdmin}
            hint="Clientes novos mandam o código de confirmação para este número."
            onChange={(e) => setForm({ ...form, whatsappLoja: e.target.value })}
          />
          <div aria-hidden="true" className="hidden sm:block" />
          <Input
            label="Tempo estimado de entrega (min)"
            name="tempoEntrega"
            inputMode="numeric"
            value={form.tempoEstimadoEntregaMin}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, tempoEstimadoEntregaMin: e.target.value })}
          />
          <Input
            label="Tempo estimado de retirada (min)"
            name="tempoRetirada"
            inputMode="numeric"
            value={form.tempoEstimadoRetiradaMin}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, tempoEstimadoRetiradaMin: e.target.value })}
          />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          {(
            [
              ["aceitaEntrega", "Fazemos entrega"],
              ["aceitaRetirada", "Cliente pode retirar no balcão"],
              [
                "entregaApenasBairrosCadastrados",
                "Entregar só nos bairros cadastrados (recusa os outros)",
              ],
            ] as const
          ).map(([campo, label]) => (
            <label key={campo} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[campo]}
                disabled={!isAdmin}
                onChange={(e) => setForm({ ...form, [campo]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-900">Cashback</p>
          <p className="mt-0.5 text-xs text-gray-500">
            O cliente ganha um percentual dos produtos quando o pedido é entregue e usa o saldo
            nos próximos pedidos (precisa estar logado). Use 0 para desligar.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Input
              label="Percentual devolvido (%)"
              name="cashbackPercentual"
              inputMode="decimal"
              value={form.cashbackPercentual}
              disabled={!isAdmin}
              hint="Ex.: 5 = R$ 3,00 num pedido de R$ 60,00 em produtos."
              onChange={(e) => setForm({ ...form, cashbackPercentual: e.target.value })}
            />
            <Input
              label="Validade do saldo (dias)"
              name="cashbackValidadeDias"
              inputMode="numeric"
              value={form.cashbackValidadeDias}
              disabled={!isAdmin}
              hint="Vale para o cashback ganho daqui pra frente."
              onChange={(e) => setForm({ ...form, cashbackValidadeDias: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <Textarea
            label="Mensagem quando estiver fechada (opcional)"
            name="mensagemFechada"
            rows={2}
            maxLength={300}
            placeholder="Ex.: Fechado hoje. Abrimos amanhã às 18h."
            value={form.mensagemFechada}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, mensagemFechada: e.target.value })}
          />
        </div>
        {isAdmin && (
          <div className="mt-4 flex justify-end">
            <Button onClick={salvar} loading={salvando} leftIcon={<Save size={16} />}>
              Salvar horários e regras
            </Button>
          </div>
        )}
      </section>

      {/* Bairros */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
          <MapPin size={18} /> Taxa por bairro
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          O nome é comparado sem acento e sem diferenciar maiúsculas (&quot;São José&quot; =
          &quot;sao jose&quot;).
        </p>
        {bairros.length === 0 ? (
          <p className="mb-4 rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
            Nenhum bairro cadastrado: todos pagam a taxa padrão ({formatBRL(config.taxaEntregaPadrao)}).
          </p>
        ) : (
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2">Bairro</th>
                <th className="py-2">Taxa</th>
                <th className="py-2">Atende</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bairros.map((b) => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{b.nome}</td>
                  <td className="py-2">
                    {isAdmin ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={Number(b.taxa).toFixed(2)}
                        aria-label={`Taxa de ${b.nome}`}
                        onBlur={(e) => {
                          const v = numero(e.target.value);
                          if (!Number.isNaN(v) && v !== Number(b.taxa)) atualizarBairro(b, { taxa: v });
                        }}
                        className="w-24 rounded-md border border-gray-300 px-2 py-1"
                      />
                    ) : (
                      formatBRL(b.taxa)
                    )}
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={b.ativo ?? true}
                      disabled={!isAdmin}
                      aria-label={`Atende ${b.nome}`}
                      onChange={(e) => atualizarBairro(b, { ativo: e.target.checked })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => removerBairro(b)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${b.nome}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <Input
                label="Novo bairro"
                name="novoBairro"
                value={novoBairro.nome}
                onChange={(e) => setNovoBairro({ ...novoBairro, nome: e.target.value })}
              />
            </div>
            <div className="w-32">
              <Input
                label="Taxa (R$)"
                name="novaTaxa"
                inputMode="decimal"
                value={novoBairro.taxa}
                onChange={(e) => setNovoBairro({ ...novoBairro, taxa: e.target.value })}
              />
            </div>
            <Button variant="secondary" onClick={criarBairro} leftIcon={<Plus size={16} />}>
              Adicionar
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function LojaPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN", "ATENDENTE"]}>
      <PainelShell title="Loja e horários" actions={<ControleMovimento />}>
        <LojaContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
