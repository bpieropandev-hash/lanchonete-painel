"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bike, Gauge, PauseCircle, PlayCircle } from "lucide-react";
import { api } from "@/lib/api";
import { horaCurta } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { ConfiguracaoLoja } from "@/types";

const PAUSAS = [15, 30, 60];
const EXTRAS = [0, 15, 30];

function erroApi(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}

/**
 * Controles rápidos para dia de movimento: pausar pedidos por um tempo
 * (volta sozinho), somar minutos ao tempo estimado e pausar só a entrega.
 * Atualiza sozinho a cada 30 s, para refletir o que outra atendente fez.
 */
export function ControleMovimento({ compacto = false }: { compacto?: boolean }) {
  const [loja, setLoja] = useState<ConfiguracaoLoja | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<ConfiguracaoLoja>("/admin/loja/configuracao");
      setLoja(data);
    } catch {
      // silencioso: o restante da tela continua funcionando
    }
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 30_000);
    return () => clearInterval(timer);
  }, [carregar]);

  const executar = async (acao: () => Promise<{ data: ConfiguracaoLoja }>, sucesso: string) => {
    setOcupado(true);
    try {
      const { data } = await acao();
      setLoja(data);
      showToast(sucesso, "success");
    } catch (err) {
      showToast(erroApi(err, "Não foi possível alterar"), "error");
    } finally {
      setOcupado(false);
    }
  };

  if (!loja) return null;

  const pausada = !!loja.pausadoAte;
  const entregaPausada = !!loja.entregaPausadaAte;

  const estado = pausada
    ? { cor: "border-red-300 bg-red-50 text-red-900", texto: `Pedidos pausados até ${horaCurta(loja.pausadoAte!)}` }
    : !loja.aberta
      ? { cor: "border-gray-300 bg-gray-50 text-gray-800", texto: "Loja fechada (horário ou modo manual)" }
      : { cor: "border-green-300 bg-green-50 text-green-900", texto: "Recebendo pedidos" };

  return (
    <section
      aria-label="Controle de movimento"
      className={`rounded-xl border p-3 ${estado.cor} ${compacto ? "" : "shadow-sm"}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          {pausada ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
          {estado.texto}
          {loja.tempoExtraMin > 0 && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900">
              +{loja.tempoExtraMin} min
            </span>
          )}
          {entregaPausada && (
            <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs text-orange-900">
              entrega pausada até {horaCurta(loja.entregaPausadaAte!)}
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {pausada ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar(() => api.delete("/admin/loja/pausa"), "Voltamos a aceitar pedidos")}
              className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Voltar a receber agora
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <span className="font-medium">Pausar:</span>
              {PAUSAS.map((min) => (
                <button
                  key={min}
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    executar(
                      () => api.post("/admin/loja/pausa", { minutos: min }),
                      `Pedidos pausados por ${min} min`
                    )
                  }
                  className="rounded-lg border border-current bg-white px-2.5 py-1.5 font-semibold hover:bg-red-100 disabled:opacity-60"
                >
                  {min} min
                </button>
              ))}
            </span>
          )}

          <span className="flex items-center gap-1">
            <Gauge size={16} aria-hidden="true" />
            <span className="font-medium">Tempo extra:</span>
            {EXTRAS.map((min) => (
              <button
                key={min}
                type="button"
                disabled={ocupado || loja.tempoExtraMin === min}
                aria-pressed={loja.tempoExtraMin === min}
                onClick={() =>
                  executar(
                    () => api.put("/admin/loja/tempo-extra", { minutos: min }),
                    min === 0 ? "Tempo normal" : `Tempo estimado +${min} min`
                  )
                }
                className={`rounded-lg border px-2.5 py-1.5 font-semibold disabled:cursor-default ${
                  loja.tempoExtraMin === min
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-current bg-white hover:bg-amber-100"
                }`}
              >
                {min === 0 ? "normal" : `+${min}`}
              </button>
            ))}
          </span>

          {loja.aceitaEntrega && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                entregaPausada
                  ? executar(() => api.delete("/admin/loja/pausa-entrega"), "Entregas retomadas")
                  : executar(
                      () => api.post("/admin/loja/pausa-entrega", { minutos: 60 }),
                      "Entregas pausadas por 60 min (retirada continua)"
                    )
              }
              className="flex items-center gap-1 rounded-lg border border-current bg-white px-2.5 py-1.5 font-semibold hover:bg-orange-100 disabled:opacity-60"
            >
              <Bike size={16} aria-hidden="true" />
              {entregaPausada ? "Retomar entregas" : "Pausar entregas 1h"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
