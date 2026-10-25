"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bike, ChevronDown } from "lucide-react";
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
 * Controles rápidos para dia de movimento, no cabeçalho: pausar pedidos por
 * um tempo (volta sozinho), somar minutos ao prazo e pausar só a entrega.
 * Atualiza sozinho a cada 30 s, para refletir o que outra atendente fez.
 */
export function ControleMovimento() {
  const [loja, setLoja] = useState<ConfiguracaoLoja | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
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

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

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
    ? { ponto: "bg-red-500", texto: `Pausado até ${horaCurta(loja.pausadoAte!)}`, borda: "border-red-200 bg-red-50 text-red-800" }
    : !loja.aberta
      ? { ponto: "bg-gray-400", texto: "Loja fechada", borda: "border-gray-200 bg-white text-gray-700" }
      : { ponto: "bg-green-500", texto: "Recebendo pedidos", borda: "border-green-200 bg-green-50 text-green-800" };

  const opcao =
    "whitespace-nowrap rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
  const opcaoAtiva = "whitespace-nowrap rounded-md border border-gray-900 bg-gray-900 px-2.5 py-1 text-sm font-medium text-white";

  return (
    <div className="relative" ref={raizRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={`flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm font-medium ${estado.borda}`}
      >
        <span className={`h-2 w-2 rounded-full ${estado.ponto}`} />
        {estado.texto}
        {loja.tempoExtraMin > 0 && (
          <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">+{loja.tempoExtraMin} min</span>
        )}
        {entregaPausada && (
          <span className="rounded bg-orange-100 px-1.5 text-xs font-semibold text-orange-800">sem entrega</span>
        )}
        <ChevronDown size={14} className="opacity-60" />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Controle de movimento"
          className="absolute right-0 top-full z-30 mt-1.5 w-80 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg"
        >
          <p className="font-semibold text-gray-900">Pedidos pelo site</p>
          {pausada ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar(() => api.delete("/admin/loja/pausa"), "Pedidos retomados")}
              className="mt-2 w-full rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              Retomar agora
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="mr-1 whitespace-nowrap text-gray-500">Pausar por</span>
              {PAUSAS.map((min) => (
                <button
                  key={min}
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    executar(() => api.post("/admin/loja/pausa", { minutos: min }), `Pedidos pausados por ${min} min`)
                  }
                  className={opcao}
                >
                  {min} min
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 font-semibold text-gray-900">Prazo informado ao cliente</p>
          <div className="mt-2 flex items-center gap-1.5">
            {EXTRAS.map((min) => (
              <button
                key={min}
                type="button"
                disabled={ocupado || loja.tempoExtraMin === min}
                aria-pressed={loja.tempoExtraMin === min}
                onClick={() =>
                  executar(
                    () => api.put("/admin/loja/tempo-extra", { minutos: min }),
                    min === 0 ? "Prazo normal" : `Prazo +${min} min`
                  )
                }
                className={loja.tempoExtraMin === min ? opcaoAtiva : opcao}
              >
                {min === 0 ? "Normal" : `+${min} min`}
              </button>
            ))}
          </div>

          {loja.aceitaEntrega && (
            <>
              <p className="mt-4 font-semibold text-gray-900">Entrega</p>
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  entregaPausada
                    ? executar(() => api.delete("/admin/loja/pausa-entrega"), "Entregas retomadas")
                    : executar(
                        () => api.post("/admin/loja/pausa-entrega", { minutos: 60 }),
                        "Entregas pausadas por 1 hora. A retirada continua."
                      )
                }
                className={`${opcao} mt-2 flex items-center gap-1.5`}
              >
                <Bike size={14} aria-hidden="true" />
                {entregaPausada
                  ? `Retomar entregas (pausadas até ${horaCurta(loja.entregaPausadaAte!)})`
                  : "Pausar entregas por 1 hora"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
