import type { EnderecoSnapshot } from "@/types";
import { formatCEP } from "@/lib/format";

/**
 * Só o número da casa ajuda a achar o endereço. "S/N", "sn", "sem número" ou
 * qualquer texto sem dígito iniciais viram vazio (a busca fica só pela rua);
 * "123 casa 2" vira "123" e "123A" continua "123A".
 */
function numeroParaBusca(numero: string | null | undefined): string {
  const m = /^(\d+)([A-Za-z])?(?=\W|$)/.exec((numero ?? "").trim());
  return m ? `${m[1]}${m[2] ?? ""}` : "";
}

/**
 * Texto de busca no formato que o Google Maps usa para endereços do Brasil
 * ("Rua X, 123, Cidade - UF, 00000-000, Brasil").
 *
 * - Com CEP válido, ele identifica a região melhor que o bairro, que o cliente
 *   digita livremente e nem sempre bate com o nome que o mapa conhece; então
 *   o bairro fica de fora.
 * - Sem CEP, o bairro entra para diferenciar ruas de mesmo nome na cidade.
 * - Partes vazias são descartadas (nada de "undefined" ou vírgulas soltas) e o
 *   complemento nunca entra: "Apto 302" confunde a busca.
 */
export function enderecoParaBusca(e: Partial<EnderecoSnapshot>): string {
  const limpo = (v: string | null | undefined) => (v ?? "").trim();
  const rua = [limpo(e.logradouro), numeroParaBusca(e.numero)]
    .filter(Boolean)
    .join(", ");
  const cidadeUf = [limpo(e.cidade), limpo(e.uf).toUpperCase()]
    .filter(Boolean)
    .join(" - ");
  const digitosCep = limpo(e.cep).replace(/\D/g, "");
  const cep = digitosCep.length === 8 ? formatCEP(digitosCep) : "";

  const partes = cep
    ? [rua, cidadeUf, cep]
    : [rua, limpo(e.bairro), cidadeUf];
  return [...partes.filter(Boolean), "Brasil"].join(", ");
}

/** Link que abre a busca do endereço no Google Maps (app ou navegador). */
export function linkMapa(e: Partial<EnderecoSnapshot>): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    enderecoParaBusca(e)
  )}`;
}
