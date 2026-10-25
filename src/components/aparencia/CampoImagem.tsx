"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { enviarImagem } from "@/lib/upload";
import { resolveImageUrl } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";

interface CampoImagemProps {
  label: string;
  hint: string;
  valor: string | null;
  onChange: (url: string | null) => void;
  /** "quadrado" para logo; "capa" para imagens horizontais (capa e banners). */
  formato: "quadrado" | "capa";
}

export function CampoImagem({ label, hint, valor, onChange, formato }: CampoImagemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const src = resolveImageUrl(valor);

  const escolher = async (file: File | undefined) => {
    if (!file) return;
    setEnviando(true);
    try {
      onChange(await enviarImagem(file, formato === "capa" ? "capa" : undefined));
    } catch {
      showToast("Não foi possível enviar a imagem. Use JPG, PNG ou WebP até 8 MB.", "error");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const area =
    formato === "quadrado" ? "h-20 w-20 rounded-xl" : "aspect-[16/5] w-full rounded-lg";

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div className={formato === "quadrado" ? "flex items-center gap-4" : "space-y-2"}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-gray-400 ${area}`}
          aria-label={valor ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
        >
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} strokeWidth={1.6} />
          )}
          {enviando && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium text-gray-700">
              Enviando…
            </span>
          )}
        </button>
        <div>
          <p className="text-xs text-gray-500">{hint}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {valor ? "Trocar" : "Enviar imagem"}
            </button>
            {valor && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
    </div>
  );
}
