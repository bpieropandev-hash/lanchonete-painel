import type { Pedido } from "@/types";

/** O que fazer com o dinheiro do pedido na hora de entregar ou retirar. */
export interface CobrancaDoPedido {
  /**
   * `true`: quem entrega (ou o balcão) cobra o total do cliente.
   * `false`: já está pago, não se cobra nada.
   */
  cobrar: boolean;
  /** Dinheiro: quanto devolver de troco. `null` quando não há troco a devolver. */
  troco: number | null;
}

/**
 * Regra de cobrança na entrega:
 * - Pix já foi pago antes de o pedido sair: não se cobra nada.
 * - Dinheiro e cartão são cobrados na entrega (cartão, na maquininha).
 * - Só o dinheiro tem troco: valor pago menos o total, quando positivo.
 */
export function cobrancaDoPedido(
  pedido: Pick<Pedido, "pagamento" | "total" | "trocoPara">
): CobrancaDoPedido {
  if (pedido.pagamento === "PIX") return { cobrar: false, troco: null };
  const troco =
    pedido.pagamento === "DINHEIRO" && pedido.trocoPara
      ? Number(pedido.trocoPara) - Number(pedido.total)
      : 0;
  return { cobrar: true, troco: troco > 0 ? troco : null };
}
