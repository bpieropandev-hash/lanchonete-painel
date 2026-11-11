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
import { cobrancaDoPedido } from "@/lib/pagamento";

/** Dados da loja impressos no cabeçalho. Só o nome é obrigatório. */
export interface DadosLoja {
  nome: string;
  endereco?: string | null;
  /** WhatsApp/telefone da loja, só dígitos ou já formatado. */
  telefone?: string | null;
  instagram?: string | null;
}

/** Largura do papel da bobina. A Knup KP-IM607 usa 58 mm (43 mm de texto, medido). */
export type PapelMm = 58 | 80;
export const PAPEL_PADRAO: PapelMm = 58;

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
 * Comprovante do pedido que acompanha o lanche na embalagem do cliente
 * (cupom não fiscal térmico, 80 mm ou 58 mm).
 *
 * Segue a estrutura-padrão de cupom brasileiro (a do DANFE NFC-e: cabeçalho do
 * estabelecimento, itens, totais, pagamento), sem imitar documento fiscal:
 * o título é "COMPROVANTE DO PEDIDO" e o aviso "NÃO É DOCUMENTO FISCAL" vem
 * logo abaixo.
 *
 *   1. Loja: nome, endereço, telefone e Instagram.
 *   2. Título e aviso de documento não fiscal.
 *   3. Pedido: número, tipo (entrega/retirada) e data.
 *   4. Cliente, telefone e endereço de entrega.
 *   5. Itens: descrição, quantidade x valor unitário e total do item, com
 *      "sem", adicionais e observação do item recuados.
 *   6. Totais: subtotal, taxa de entrega, desconto e total.
 *   7. Pagamento: o que pagar na entrega (ou no balcão) e o troco; Pix consta
 *      como PAGO, pela mesma regra da tela do entregador (`cobrancaDoPedido`).
 *   8. Observação do pedido e agradecimento.
 *
 * Largura útil do papel: 72 mm em 80 mm e 43 mm em 58 mm (padrão, medida na KP-IM607). `@page { margin: 0 }`
 * (também impede o navegador de imprimir cabeçalho e rodapé dele) e margens
 * internas que deixam só a área útil. Só preto e branco, fonte monoespaçada,
 * um único tamanho de texto com poucos destaques em negrito.
 */
export function montarNotinhaHtml(
  pedido: Pedido,
  loja: DadosLoja = { nome: NOME_LOJA },
  papelMm: PapelMm = PAPEL_PADRAO
): string {
  const estreito = papelMm === 58;
  const retirada = pedido.tipoEntrega === "RETIRADA";
  const contato = contatoDoPedido(pedido);
  const end = pedido.enderecoEntregaSnapshot;
  const desconto = Number(pedido.descontoCashback ?? 0);
  const cobranca = cobrancaDoPedido(pedido);
  const entregador = pedido.entrega?.entregador?.nome;
  const numero = String(pedido.numero).padStart(3, "0");

  const dadosLoja = [
    loja.endereco?.trim(),
    loja.telefone?.trim() ? `WhatsApp ${formatTelefone(loja.telefone.trim())}` : null,
    loja.instagram?.trim() ? `@${loja.instagram.trim().replace(/^@/, "")}` : null,
  ].filter(Boolean) as string[];

  const itens = pedido.itens
    .map((item) => {
      const p = item.personalizacoes;
      const nome = `${item.nomeProdutoSnapshot}${
        item.nomeVarianteSnapshot ? ` - ${item.nomeVarianteSnapshot}` : ""
      }`;
      const linhas = [
        `<div class="nome">${esc(nome)}</div>`,
        `<div class="linha"><span>${esc(item.quantidade)} x ${esc(
          formatBRL(item.precoUnitario)
        )}</span><span>${esc(formatBRL(item.subtotal))}</span></div>`,
      ];
      if (p?.removidos?.length)
        linhas.push(`<div class="det">SEM: ${esc(p.removidos.join(", "))}</div>`);
      if (p?.adicionados?.length)
        linhas.push(`<div class="det">+ ${esc(p.adicionados.map((a) => a.nome).join(", "))}</div>`);
      if (p?.observacao) linhas.push(`<div class="det">OBS: ${esc(p.observacao)}</div>`);
      return `<div class="item">${linhas.join("")}</div>`;
    })
    .join("");

  const enderecoHtml =
    !retirada && end
      ? `<h2>ENDEREÇO DE ENTREGA</h2>
  <div>${esc(end.logradouro)}, ${esc(end.numero)}${end.complemento ? ` - ${esc(end.complemento)}` : ""}</div>
  <div>${esc(end.bairro)}</div>
  <div>${esc(end.cidade)}/${esc(end.uf)}${end.cep ? ` &middot; <span class="nb">CEP ${esc(formatCEP(end.cep))}</span>` : ""}</div>
  ${entregador ? `<div>Entregador: ${esc(entregador)}</div>` : ""}`
      : "";

  // Pix já foi pago. Dinheiro e cartão se pagam na entrega (ou no balcão).
  const onde = retirada ? "NO BALCÃO" : "NA ENTREGA";
  const pagamentoHtml = cobranca.cobrar
    ? `<div class="linha forte"><span>A PAGAR ${onde}</span><span>${esc(formatBRL(pedido.total))}</span></div>
  <div class="linha"><span>Forma de pagamento</span><span>${esc(tipoPagamentoLabel(pedido.pagamento))}</span></div>
  ${
    cobranca.troco !== null
      ? `<div class="linha"><span>Troco para</span><span>${esc(formatBRL(pedido.trocoPara!))}</span></div>
  <div class="linha forte"><span>Troco</span><span>${esc(formatBRL(cobranca.troco))}</span></div>`
      : ""
  }`
    : `<div class="linha forte"><span>${esc(tipoPagamentoLabel(pedido.pagamento))}</span><span>PAGO</span></div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido #${esc(numero)}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body {
    /* 58 mm: valores medidos na KP-IM607 (calibração impressa): 5 mm à esquerda
       e 10 mm à direita deixam 43 mm de texto, sem perder o fim das linhas.
       Sempre limitado à página do driver (width: 100%). */
    margin: 0; width: 100%; max-width: ${estreito ? 58 : 72}mm;
    padding: 3mm ${estreito ? 10 : 3}mm 8mm ${estreito ? 5 : 1}mm;
    font-family: "Liberation Mono", "DejaVu Sans Mono", Consolas, Menlo, "Courier New", monospace;
    /* Negrito em tudo: na térmica o traço normal sai claro e perde pedaços da
       letra (testado na KP-IM607). A largura do monoespaçado não muda. */
    font-weight: 700;
    font-size: ${estreito ? 10 : 11}px; line-height: 1.4; color: #000; background: #fff; overflow-wrap: anywhere;
  }
  .loja { text-align: center; font-weight: 700; font-size: ${estreito ? 14 : 15}px; letter-spacing: 0.5px; }
  .dados { text-align: center; font-size: ${estreito ? 9 : 10}px; margin-top: 2px; }
  .tr { margin: 7px 0; border: 0; border-top: 1px dashed #000; }
  .titulo { text-align: center; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; }
  .aviso { text-align: center; font-weight: 700; font-size: ${estreito ? 9 : 10}px; }
  .pedido { font-size: ${estreito ? 14 : 16}px; font-weight: 700; }
  h2 { margin: 8px 0 2px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
  .linha { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
  .linha span:last-child { white-space: nowrap; text-align: right; }
  .forte { font-weight: 700; }
  .tel, .nb { white-space: nowrap; }
  .item { margin-top: 5px; }
  .nome { font-weight: 700; }
  .det { padding-left: 2ch; }
  .total { margin-top: 4px; padding-top: 3px; border-top: 1px solid #000; font-size: ${estreito ? 13 : 14}px; font-weight: 700; }
  .rodape { margin-top: 2px; text-align: center; }
</style></head><body>
  <div class="loja">${esc(loja.nome.toLocaleUpperCase("pt-BR"))}</div>
  ${dadosLoja.length ? `<div class="dados">${dadosLoja.map(esc).join("<br>")}</div>` : ""}
  <hr class="tr">
  <div class="titulo">COMPROVANTE DO PEDIDO</div>
  <div class="aviso">NÃO É DOCUMENTO FISCAL</div>
  <hr class="tr">
  <div class="linha"><span class="pedido">PEDIDO #${esc(numero)}</span><span class="forte">${retirada ? "RETIRADA" : "ENTREGA"}</span></div>
  <div>${esc(formatDataHora(pedido.criadoEm))}</div>
  <hr class="tr">
  <h2>CLIENTE</h2>
  <div>${esc(contato.nome)}</div>
  ${contato.telefone ? `<div class="tel">Tel ${esc(formatTelefone(contato.telefone))}</div>` : ""}
  ${enderecoHtml}
  <hr class="tr">
  <h2>ITENS</h2>
  ${itens}
  <hr class="tr">
  <div class="linha"><span>Subtotal</span><span>${esc(formatBRL(pedido.subtotal))}</span></div>
  ${!retirada ? `<div class="linha"><span>Taxa de entrega</span><span>${esc(formatBRL(pedido.taxaEntrega))}</span></div>` : ""}
  ${desconto > 0 ? `<div class="linha"><span>Desconto cashback</span><span>-${esc(formatBRL(desconto))}</span></div>` : ""}
  <div class="linha total"><span>TOTAL</span><span>${esc(formatBRL(pedido.total))}</span></div>
  <hr class="tr">
  <h2>PAGAMENTO</h2>
  ${pagamentoHtml}
  ${pedido.obs ? `<hr class="tr"><h2>OBSERVAÇÃO</h2><div>${esc(pedido.obs)}</div>` : ""}
  <hr class="tr">
  <div class="rodape">Obrigado pela preferência!<br>Bom apetite!</div>
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
export function imprimirNotinha(
  pedido: Pedido,
  loja: DadosLoja = { nome: NOME_LOJA },
  papelMm: PapelMm = PAPEL_PADRAO
): boolean {
  const janela = window.open("", "_blank", "width=420,height=640");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(montarNotinhaHtml(pedido, loja, papelMm));
  janela.document.close();
  janela.focus();
  janela.onafterprint = () => janela.close();
  setTimeout(() => janela.print(), 250);
  return true;
}
