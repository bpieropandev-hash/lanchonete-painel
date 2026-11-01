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
 * Notinha térmica que acompanha o lanche: a via do entregador (entrega) ou do
 * balcão (retirada).
 *
 * Segue as convenções de recibo de impressora térmica e de comanda de delivery:
 * - Largura útil: o papel de 80 mm imprime 72 mm e o de 58 mm imprime 48 mm.
 *   O CSS usa `@page { margin: 0 }` (também impede o navegador de imprimir
 *   cabeçalho e rodapé) e margens internas que deixam a área útil do papel
 *   (4 mm de cada lado em 80 mm, 5 mm em 58 mm).
 * - Só preto e branco, fonte monoespaçada; o único fundo preenchido é a faixa do
 *   tipo do pedido, por isso `print-color-adjust: exact`.
 * - Hierarquia: número do pedido enorme (para achar a sacola); em seguida o que
 *   o entregador precisa ao sair (cliente, telefone, endereço, quanto cobrar e
 *   quanto levar de troco); só depois itens e totais.
 * - Itens em colunas QTD / ITEM / VALOR, com o detalhamento recuado.
 * - Rodapé identifica a via como controle interno e avisa que não é documento
 *   fiscal (comanda não substitui o documento fiscal).
 *
 * Diz o mesmo que a tela de entregas (/entrega): cobrar o total na forma de
 * pagamento escolhida e, em dinheiro, levar de troco o valor pago menos o total.
 */
export function montarNotinhaHtml(
  pedido: Pedido,
  nomeLoja: string = NOME_LOJA,
  agora: Date = new Date()
): string {
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
  const numero = String(pedido.numero).padStart(3, "0");

  const itens = pedido.itens
    .map((item) => {
      const p = item.personalizacoes;
      const nome = `${item.nomeProdutoSnapshot}${
        item.nomeVarianteSnapshot ? ` - ${item.nomeVarianteSnapshot}` : ""
      }`;
      const linhas = [
        `<div class="item"><span>${esc(item.quantidade)}x</span><span>${esc(nome)}</span><span class="val">${esc(
          formatBRL(item.subtotal)
        )}</span></div>`,
      ];
      if (p?.removidos?.length)
        linhas.push(`<div class="det">SEM: ${esc(p.removidos.join(", "))}</div>`);
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
  <div>${esc(end.cidade)}/${esc(end.uf)}${end.cep ? ` &middot; <span class="nb">CEP ${esc(formatCEP(end.cep))}</span>` : ""}</div>`
      : "";

  // Entrega: o entregador cobra o total. Retirada: o pagamento é no balcão.
  const cobrancaHtml = retirada
    ? ""
    : `<div class="cobrar">
    <div class="rotulo">COBRAR</div>
    <div class="valor">${esc(formatBRL(pedido.total))}</div>
    <div class="forma">${esc(tipoPagamentoLabel(pedido.pagamento))}</div>
  </div>`;

  const trocoHtml =
    troco !== null && troco > 0
      ? `<div class="troco">Paga com ${esc(formatBRL(pedido.trocoPara!))}<br>LEVAR ${esc(formatBRL(troco))} DE TROCO</div>`
      : "";

  const totaisHtml = `<div class="linha"><span>Subtotal</span><span>${esc(formatBRL(pedido.subtotal))}</span></div>
  ${!retirada ? `<div class="linha"><span>Taxa de entrega</span><span>${esc(formatBRL(pedido.taxaEntrega))}</span></div>` : ""}
  ${desconto > 0 ? `<div class="linha"><span>Desconto cashback</span><span>-${esc(formatBRL(desconto))}</span></div>` : ""}
  <div class="linha total"><span>TOTAL</span><span>${esc(formatBRL(pedido.total))}</span></div>
  ${retirada ? `<div class="linha"><span>Pagamento</span><span>${esc(tipoPagamentoLabel(pedido.pagamento))}</span></div>` : ""}`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido #${esc(numero)}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; width: 100%; max-width: 80mm; padding: 3mm 4mm 8mm;
    font-family: "Liberation Mono", "DejaVu Sans Mono", Consolas, Menlo, "Courier New", monospace;
    font-size: 11px; line-height: 1.35; color: #000; background: #fff; overflow-wrap: anywhere;
  }
  .centro { text-align: center; }
  .loja { text-align: center; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; }
  .via { text-align: center; font-size: 10px; letter-spacing: 2px; margin-top: 1px; }
  .numero { text-align: center; font-weight: 700; font-size: 58px; line-height: 1; margin: 6px 0 2px; }
  .data { text-align: center; }
  .tipo { margin: 7px 0 0; padding: 4px 0; text-align: center; font-weight: 700; font-size: 16px; letter-spacing: 1px; background: #000; color: #fff; }
  h2 { margin: 10px 0 3px; padding-bottom: 1px; border-bottom: 1px solid #000; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
  .grande { font-size: 16px; font-weight: 700; line-height: 1.25; }
  .tel, .nb { white-space: nowrap; }
  .cobrar { margin: 10px 0 4px; padding: 4px 4px 5px; border: 3px solid #000; text-align: center; font-weight: 700; }
  .cobrar .rotulo { font-size: 12px; letter-spacing: 4px; }
  .cobrar .valor { font-size: 32px; line-height: 1.1; }
  .cobrar .forma { font-size: 12px; text-transform: uppercase; }
  .troco { margin: 5px 0; text-align: center; font-size: 15px; font-weight: 700; }
  .obs { margin-top: 9px; padding: 4px 5px; border: 2px solid #000; font-weight: 700; }
  .item { display: grid; grid-template-columns: 26px 1fr auto; column-gap: 5px; margin-top: 5px; font-size: 12px; font-weight: 700; }
  .det { padding-left: 31px; }
  .val { white-space: nowrap; text-align: right; }
  .totais { margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; }
  .linha { display: flex; justify-content: space-between; gap: 6px; }
  .linha span:last-child { white-space: nowrap; }
  .total { margin-top: 3px; padding-top: 3px; border-top: 1px solid #000; font-size: 16px; font-weight: 700; }
  .motoboy { margin-top: 8px; text-align: center; font-weight: 700; }
  .rodape { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #000; text-align: center; font-size: 10px; }
  .rodape b { display: block; font-size: 11px; letter-spacing: 1px; }
  /* Papel estreito (58 mm, 48 mm úteis). Fica por último para vencer as regras acima. */
  @media (max-width: 64mm) {
    body { padding-left: 5mm; padding-right: 5mm; font-size: 10px; }
    .numero { font-size: 50px; }
    .tipo { font-size: 14px; }
    .grande { font-size: 14px; }
    .cobrar .valor { font-size: 26px; }
    .troco { font-size: 12px; }
    .item { font-size: 11px; }
    .total { font-size: 14px; }
  }
</style></head><body>
  <div class="loja">${esc(nomeLoja.toLocaleUpperCase("pt-BR"))}</div>
  <div class="via">${retirada ? "VIA DO BALCÃO" : "VIA DO ENTREGADOR"}</div>
  <div class="numero">#${esc(numero)}</div>
  <div class="data">${esc(formatDataHora(pedido.criadoEm))}</div>
  <div class="tipo">${retirada ? "RETIRADA NO BALCÃO" : "ENTREGA"}</div>
  <h2>CLIENTE</h2>
  <div class="grande">${esc(contato.nome)}</div>
  ${contato.telefone ? `<div class="grande tel">Tel ${esc(formatTelefone(contato.telefone))}</div>` : ""}
  ${enderecoHtml}
  ${cobrancaHtml}
  ${trocoHtml}
  ${pedido.obs ? `<div class="obs">OBS: ${esc(pedido.obs)}</div>` : ""}
  <h2>ITENS</h2>
  ${itens}
  <div class="totais">
  ${totaisHtml}
  </div>
  ${motoboy ? `<div class="motoboy">Entregador: ${esc(motoboy)}</div>` : ""}
  <div class="rodape">
    <b>NÃO É DOCUMENTO FISCAL</b>
    Via de controle interno<br>
    Impresso em ${esc(formatDataHora(agora))}
  </div>
</body></html>`;
}

/**
 * Abre a notinha numa janela própria e chama a impressão. O tamanho do papel
 * vem da impressora escolhida (o CSS `@page { size }` não aceita "80mm auto"):
 * numa térmica, deixe o papel de 80 mm (ou 58 mm) configurado no driver; a
 * largura do conteúdo se adapta. Para imprimir sem a caixa de diálogo, use o
 * modo quiosque do Chrome (--kiosk-printing) no computador do caixa. Devolve
 * false se o navegador bloqueou a janela (pop-up).
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
