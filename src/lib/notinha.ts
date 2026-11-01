import type { Pedido } from "@/types";
import {
  contatoDoPedido,
  formatBRL,
  formatCEP,
  formatDataHora,
  formatTelefone,
  tipoPagamentoLabel,
} from "@/lib/format";
import { NOME_LOJA } from "@/lib/marca";

/** Todo texto vindo do cliente passa por aqui antes de entrar no HTML. */
function esc(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Notinha que acompanha o lanche e é lida pelo motoboy: número grande para
 * achar a sacola, cliente e telefone, endereço completo, itens, quanto cobrar
 * e quanto levar de troco. Diz o mesmo que a tela de entregas (/entrega).
 */
export function montarNotinhaHtml(pedido: Pedido, nomeLoja: string = NOME_LOJA): string {
  const retirada = pedido.tipoEntrega === "RETIRADA";
  const contato = contatoDoPedido(pedido);
  const end = pedido.enderecoEntregaSnapshot;
  const total = Number(pedido.total);
  const desconto = Number(pedido.descontoCashback ?? 0);
  const troco =
    pedido.pagamento === "DINHEIRO" && pedido.trocoPara
      ? Number(pedido.trocoPara) - total
      : null;
  const motoboy = pedido.entrega?.entregador?.nome;

  const itens = pedido.itens
    .map((item) => {
      const p = item.personalizacoes;
      const nome = `${item.quantidade}x ${item.nomeProdutoSnapshot}${
        item.nomeVarianteSnapshot ? ` - ${item.nomeVarianteSnapshot}` : ""
      }`;
      const linhas = [
        `<div class="item"><b>${esc(nome)}</b><span>${esc(formatBRL(item.subtotal))}</span></div>`,
      ];
      if (p?.removidos?.length) linhas.push(`<div class="det">SEM: ${esc(p.removidos.join(", "))}</div>`);
      if (p?.adicionados?.length)
        linhas.push(`<div class="det">+ ${esc(p.adicionados.map((a) => a.nome).join(", "))}</div>`);
      if (p?.observacao) linhas.push(`<div class="det">OBS: ${esc(p.observacao)}</div>`);
      return linhas.join("");
    })
    .join("");

  const enderecoHtml =
    !retirada && end
      ? `<h2>ENDEREÇO</h2>
  <div class="grande">${esc(end.logradouro)}, ${esc(end.numero)}</div>
  ${end.complemento ? `<div class="grande">${esc(end.complemento)}</div>` : ""}
  <div class="grande">${esc(end.bairro)}</div>
  <div>${esc(end.cidade)}/${esc(end.uf)}${end.cep ? ` - CEP ${esc(formatCEP(end.cep))}` : ""}</div>`
      : "";

  const pagamentoHtml = retirada
    ? `<div class="linha total"><span>TOTAL</span><span>${esc(formatBRL(pedido.total))}</span></div>
  <div class="linha"><span>Pagamento</span><span>${esc(tipoPagamentoLabel(pedido.pagamento))}</span></div>`
    : `<div class="cobrar">
    <div>COBRAR</div>
    <div class="valor">${esc(formatBRL(pedido.total))}</div>
    <div>${esc(tipoPagamentoLabel(pedido.pagamento))}</div>
  </div>`;

  const trocoHtml =
    troco !== null && troco > 0
      ? `<div class="troco">Paga com ${esc(formatBRL(pedido.trocoPara!))}<br>LEVAR ${esc(formatBRL(troco))} DE TROCO</div>`
      : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido #${esc(pedido.numero)}</title>
<style>
  @page { margin: 3mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; font-size: 12px; width: 100%; max-width: 74mm; margin: 0; color: #000; overflow-wrap: anywhere; }
  .centro { text-align: center; }
  .loja { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
  .numero { font-size: 52px; font-weight: bold; text-align: center; line-height: 1.05; margin: 2px 0; }
  .tipo { font-size: 16px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 3px; margin: 6px 0; }
  h2 { font-size: 11px; letter-spacing: 1px; margin: 8px 0 2px; border-bottom: 1px solid #000; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .grande { font-size: 15px; font-weight: bold; }
  .item { display: flex; justify-content: space-between; gap: 4px; margin-top: 4px; font-size: 13px; }
  .item span, .linha span { white-space: nowrap; }
  .det { padding-left: 10px; font-size: 12px; }
  .linha { display: flex; justify-content: space-between; gap: 4px; }
  .total { font-size: 15px; font-weight: bold; }
  .cobrar { border: 3px solid #000; text-align: center; padding: 4px; margin: 8px 0 4px; font-weight: bold; }
  .cobrar .valor { font-size: 26px; }
  .troco { font-size: 15px; font-weight: bold; text-align: center; margin: 4px 0; }
  .obs { border: 1px solid #000; padding: 3px; margin-top: 6px; }
</style></head><body>
  <div class="loja">${esc(nomeLoja)}</div>
  <div class="numero">#${esc(pedido.numero)}</div>
  <div class="centro">${esc(formatDataHora(pedido.criadoEm))}</div>
  <div class="tipo">${retirada ? "RETIRADA NO BALCÃO" : "ENTREGA"}</div>
  <h2>CLIENTE</h2>
  <div class="grande">${esc(contato.nome)}</div>
  ${contato.telefone ? `<div class="grande">${esc(formatTelefone(contato.telefone))}</div>` : ""}
  ${enderecoHtml}
  <h2>ITENS</h2>
  ${itens}
  <hr>
  <div class="linha"><span>Subtotal</span><span>${esc(formatBRL(pedido.subtotal))}</span></div>
  ${!retirada ? `<div class="linha"><span>Entrega</span><span>${esc(formatBRL(pedido.taxaEntrega))}</span></div>` : ""}
  ${desconto > 0 ? `<div class="linha"><span>Desconto cashback</span><span>-${esc(formatBRL(desconto))}</span></div>` : ""}
  ${pagamentoHtml}
  ${trocoHtml}
  ${pedido.obs ? `<div class="obs">OBS: ${esc(pedido.obs)}</div>` : ""}
  ${motoboy ? `<hr><div class="centro">Motoboy: ${esc(motoboy)}</div>` : ""}
</body></html>`;
}

/**
 * Abre a notinha numa janela própria e chama a impressão. O tamanho do papel
 * vem da impressora escolhida (o CSS `@page { size }` não aceita "80mm auto"):
 * numa térmica, deixe o papel de 80 mm (ou 58 mm) configurado no driver; a
 * largura do conteúdo se adapta (até 74 mm). Para imprimir sem a caixa de
 * diálogo, use o modo quiosque do Chrome (--kiosk-printing) no computador do
 * caixa. Devolve false se o navegador bloqueou a janela (pop-up).
 */
export function imprimirNotinha(pedido: Pedido, nomeLoja: string = NOME_LOJA): boolean {
  const janela = window.open("", "_blank", "width=420,height=640");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(montarNotinhaHtml(pedido, nomeLoja));
  janela.document.close();
  janela.focus();
  janela.onafterprint = () => janela.close();
  setTimeout(() => janela.print(), 250);
  return true;
}
