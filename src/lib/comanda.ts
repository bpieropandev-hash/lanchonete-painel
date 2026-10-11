import type { Pedido } from "@/types";
import { formatBRL, formatDataHora, tipoPagamentoLabel } from "@/lib/format";

const NOME_LOJA = process.env.NEXT_PUBLIC_NOME_LOJA || "Lanchonete";

/** Todo texto vindo do cliente passa por aqui antes de entrar no HTML. */
function esc(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function montarComandaHtml(pedido: Pedido): string {
  const retirada = pedido.tipoEntrega === "RETIRADA";
  const end = pedido.enderecoEntregaSnapshot;
  const troco =
    pedido.pagamento === "DINHEIRO" && pedido.trocoPara
      ? Number(pedido.trocoPara) - Number(pedido.total)
      : null;

  const itens = pedido.itens
    .map((item) => {
      const p = item.personalizacoes;
      const linhas = [
        `<div class="item"><b>${item.quantidade}x ${esc(item.nomeProdutoSnapshot)}${
          item.nomeVarianteSnapshot ? ` - ${esc(item.nomeVarianteSnapshot)}` : ""
        }</b><span>${esc(formatBRL(item.subtotal))}</span></div>`,
      ];
      if (p?.removidos?.length) linhas.push(`<div class="det">SEM: ${esc(p.removidos.join(", "))}</div>`);
      if (p?.adicionados?.length)
        linhas.push(`<div class="det">+ ${esc(p.adicionados.map((a) => a.nome).join(", "))}</div>`);
      if (p?.observacao) linhas.push(`<div class="det">OBS: ${esc(p.observacao)}</div>`);
      return linhas.join("");
    })
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido #${esc(pedido.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; width: 74mm; margin: 0; color: #000; }
  h1 { font-size: 26px; text-align: center; margin: 4px 0; }
  .centro { text-align: center; }
  .tipo { font-size: 16px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 2px; margin: 4px 0; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .item { display: flex; justify-content: space-between; gap: 4px; margin-top: 4px; font-size: 13px; }
  .det { padding-left: 10px; font-size: 12px; }
  .linha { display: flex; justify-content: space-between; }
  .total { font-size: 15px; font-weight: bold; }
  .obs { border: 1px solid #000; padding: 3px; margin-top: 4px; }
</style></head><body>
  <div class="centro">${esc(NOME_LOJA)}</div>
  <h1>#${esc(pedido.numero)}</h1>
  <div class="centro">${esc(formatDataHora(pedido.criadoEm))}</div>
  <div class="tipo">${retirada ? "RETIRADA NO BALCÃO" : "ENTREGA"}</div>
  <hr>
  ${pedido.cliente ? `<div><b>${esc(pedido.cliente.nome)}</b></div><div>${esc(pedido.cliente.telefone)}</div>` : ""}
  ${
    !retirada && end
      ? `<div>${esc(end.logradouro)}, ${esc(end.numero)}${end.complemento ? ` - ${esc(end.complemento)}` : ""}</div><div>${esc(end.bairro)} - ${esc(end.cidade)}/${esc(end.uf)}</div>`
      : ""
  }
  <hr>
  ${itens}
  <hr>
  <div class="linha"><span>Subtotal</span><span>${esc(formatBRL(pedido.subtotal))}</span></div>
  ${!retirada ? `<div class="linha"><span>Entrega</span><span>${esc(formatBRL(pedido.taxaEntrega))}</span></div>` : ""}
  <div class="linha total"><span>TOTAL</span><span>${esc(formatBRL(pedido.total))}</span></div>
  <div class="linha"><span>Pagamento</span><span>${esc(tipoPagamentoLabel(pedido.pagamento))}</span></div>
  ${
    troco !== null
      ? `<div class="linha"><span>Troco p/ ${esc(formatBRL(pedido.trocoPara!))}</span><span><b>${esc(formatBRL(troco))}</b></span></div>`
      : ""
  }
  ${pedido.obs ? `<div class="obs">OBS: ${esc(pedido.obs)}</div>` : ""}
</body></html>`;
}

/**
 * Abre a comanda numa janela própria e chama a impressão. Funciona com
 * impressora térmica de 80 mm configurada como impressora padrão; para
 * imprimir sem a caixa de diálogo, use o modo quiosque do Chrome
 * (--kiosk-printing) no computador do caixa.
 */
export function imprimirComanda(pedido: Pedido): boolean {
  const janela = window.open("", "_blank", "width=420,height=640");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(montarComandaHtml(pedido));
  janela.document.close();
  janela.focus();
  janela.onafterprint = () => janela.close();
  setTimeout(() => janela.print(), 150);
  return true;
}
