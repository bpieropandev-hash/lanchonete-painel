"use client";

import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { CORES_SUGERIDAS, contraste, corValida } from "@/lib/cor";

interface SeletorCorProps {
  valor: string;
  onChange: (cor: string) => void;
}

export function SeletorCor({ valor, onChange }: SeletorCorProps) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  const info = corValida(valor) ? contraste(valor) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {CORES_SUGERIDAS.map((cor) => {
          const ativa = cor.toUpperCase() === valor.toUpperCase();
          return (
            <button
              key={cor}
              type="button"
              onClick={() => onChange(cor)}
              aria-label={`Usar a cor ${cor}`}
              aria-pressed={ativa}
              className={`h-8 w-8 rounded-full ring-1 ring-inset ring-black/10 ${
                ativa ? "outline outline-2 outline-offset-2 outline-gray-900" : ""
              }`}
              style={{ backgroundColor: cor }}
            />
          );
        })}
        <label className="ml-1 flex h-8 items-center gap-2 rounded-md border border-gray-300 px-2">
          <input
            type="color"
            value={corValida(valor) ? valor : "#000000"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            aria-label="Escolher outra cor"
          />
          <input
            value={texto}
            onChange={(e) => {
              const v = e.target.value.trim();
              setTexto(v);
              if (corValida(v)) onChange(v.toUpperCase());
            }}
            maxLength={7}
            className="w-20 font-mono text-sm outline-none"
            aria-label="Código da cor"
          />
        </label>
      </div>
      {info && (
        <p
          className={`mt-3 flex items-center gap-1.5 text-xs ${info.ok ? "text-green-700" : "text-amber-700"}`}
        >
          {info.ok ? <Check size={14} /> : <TriangleAlert size={14} />}
          {info.ok
            ? `Contraste bom: o texto dos botões fica ${info.texto} e legível.`
            : `Contraste baixo (${info.razao.toFixed(1)}:1). O texto dos botões pode ficar difícil de ler; prefira uma cor mais escura.`}
        </p>
      )}
    </div>
  );
}
