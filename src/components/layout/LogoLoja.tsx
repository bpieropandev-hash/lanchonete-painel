"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { useMarcaStore } from "@/store/marcaStore";
import { iniciaisLoja } from "@/lib/marca";
import { resolveImageUrl } from "@/lib/format";

/** Logo enviado em Aparência; sem logo, as iniciais do nome sobre a cor da marca. */
export function LogoLoja({ className = "h-8 w-8 text-xs" }: { className?: string }) {
  const { nome, logoUrl, carregar } = useMarcaStore();
  useEffect(() => {
    carregar();
  }, [carregar]);

  const src = resolveImageUrl(logoUrl);
  if (src) {
    return <img src={src} alt="" className={`shrink-0 rounded-md object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-md bg-primary-500 font-bold text-white ${className}`}
    >
      {iniciaisLoja(nome)}
    </span>
  );
}
