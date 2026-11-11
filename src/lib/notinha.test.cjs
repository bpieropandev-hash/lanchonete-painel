/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compila um .ts de src/lib resolvendo o alias "@/lib/..." para os próprios arquivos.
const cache = new Map();
function carregar(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const arquivo = path.resolve(__dirname, `${nome}.ts`);
  const mod = new Module(arquivo, module);
  mod.require = (id) => (id.startsWith('@/lib/') ? carregar(id.slice('@/lib/'.length)) : require(id));
  const js = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  mod._compile(js, arquivo);
  cache.set(nome, mod.exports);
  return mod.exports;
}
const { montarNotinhaHtml } = carregar('notinha');

const LOJA = { nome: 'Nelsons Burguer', endereco: 'Rua das Flores, 123 - Centro', telefone: '12988887777', instagram: 'nelsonsburguer' };
const base = {
  id: 'p1', numero: 107, clienteId: null, cliente: null, status: 'PRONTO', tipoEntrega: 'ENTREGA',
  nomeContato: 'Maria de Oliveira', telefoneContato: '12999998888', codigoConfirmacao: null,
  pagamento: 'DINHEIRO', trocoPara: '100.00', subtotal: '58.00', taxaEntrega: '6.00', total: '64.00',
  obs: 'Tocar a campainha', motivoCancelamento: null,
  enderecoEntregaSnapshot: {
    logradouro: 'Rua das Flores', numero: '12', complemento: 'Apto 302', bairro: 'Centro',
    cidade: 'São José', uf: 'SP', cep: '12345000',
  },
  entrega: { id: 'e1', entregadorId: 'en1', entregador: { id: 'en1', nome: 'João' }, saiuEm: null, entregueEm: null },
  itens: [
    { id: 'i1', nomeProdutoSnapshot: 'X-Burguer', nomeVarianteSnapshot: 'Duplo', quantidade: 2, precoUnitario: '18.00', subtotal: '36.00',
      personalizacoes: { removidos: ['Cebola'], adicionados: [{ nome: 'Bacon extra', preco: '4.00' }], observacao: 'bem passado' } },
    { id: 'i2', nomeProdutoSnapshot: 'Batata', nomeVarianteSnapshot: null, quantidade: 1, precoUnitario: '22.00', subtotal: '22.00', personalizacoes: null },
  ],
  criadoEm: '2026-11-01T15:00:00.000Z', atualizadoEm: '2026-11-01T15:00:00.000Z',
};
const dinheiro = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// formatBRL usa espaço não separável (U+00A0) entre R$ e o valor.
const brl = (v) => dinheiro(v).replace(/\s/g, ' ');
const html = (pedido = base, loja = LOJA) => montarNotinhaHtml(pedido, loja);
const texto = (h) => h.replace(/<head>[\s\S]*?<\/head>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');
const comPagamento = (pagamento, extra = {}) => ({ ...base, pagamento, trocoPara: pagamento === 'DINHEIRO' ? '100.00' : null, ...extra });
const retirada = { tipoEntrega: 'RETIRADA', enderecoEntregaSnapshot: null, taxaEntrega: '0.00' };

test('cabeçalho padrão de cupom: loja, endereço, WhatsApp e Instagram', () => {
  const t = texto(html());
  assert.match(t, /^ ?NELSONS BURGUER Rua das Flores, 123 - Centro WhatsApp \(12\) 98888-7777 @nelsonsburguer /);
});

test('cabeçalho só com o nome quando a loja não tem os outros dados', () => {
  const h = html(base, { nome: 'Lanchonete X' });
  assert.match(texto(h), /^ ?LANCHONETE X COMPROVANTE DO PEDIDO/);
  assert.doesNotMatch(h, /class="dados"/);
  assert.doesNotMatch(texto(h), /WhatsApp|@/);
  const vazios = html(base, { nome: 'Lanchonete X', endereco: '  ', telefone: null, instagram: '' });
  assert.doesNotMatch(vazios, /class="dados"/);
});

test('Instagram com @ digitado não duplica o @', () => {
  assert.match(texto(html(base, { ...LOJA, instagram: '@nelsons' })), /@nelsons(?!\S*@)/);
  assert.doesNotMatch(texto(html(base, { ...LOJA, instagram: '@nelsons' })), /@@/);
});

test('título "COMPROVANTE DO PEDIDO" e aviso "NÃO É DOCUMENTO FISCAL" logo abaixo, antes dos dados do pedido', () => {
  const t = texto(html());
  assert.match(t, /COMPROVANTE DO PEDIDO NÃO É DOCUMENTO FISCAL PEDIDO #107/);
});

test('não é mais uma via interna: sem "via do entregador", "controle interno" ou "COBRAR" gigante', () => {
  const h = html();
  assert.doesNotMatch(h, /VIA DO ENTREGADOR|VIA DO BALCÃO|controle interno|Via de controle/i);
  assert.doesNotMatch(h, /class="cobrar"|class="pago"|class="tipo"|class="numero"/);
});

test('pedido: número com 3 dígitos, tipo e data', () => {
  const t = texto(html());
  assert.match(t, /PEDIDO #107 ENTREGA \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  assert.match(texto(html({ ...base, numero: 7 })), /PEDIDO #007/);
  assert.match(html({ ...base, numero: 7 }), /<title>Pedido #007<\/title>/);
  assert.match(texto(html({ ...base, numero: 1234 })), /PEDIDO #1234/);
  assert.match(texto(html(comPagamento('PIX', retirada))), /PEDIDO #107 RETIRADA/);
});

test('cliente e endereço de entrega', () => {
  const t = texto(html());
  assert.match(t, /CLIENTE Maria de Oliveira Tel \(12\) 99999-8888/);
  assert.match(t, /ENDEREÇO DE ENTREGA Rua das Flores, 12 - Apto 302 Centro São José\/SP · CEP 12345-000/);
  assert.match(t, /Entregador: João/);
});

test('retirada: sem endereço de entrega e sem taxa de entrega', () => {
  const t = texto(html({ ...base, ...retirada }));
  assert.match(t, /RETIRADA/);
  assert.doesNotMatch(t, /ENDEREÇO DE ENTREGA|Taxa de entrega|Entregador:/);
});

test('itens: descrição, quantidade x valor unitário e total do item; detalhes recuados', () => {
  const t = texto(html());
  assert.ok(t.includes(`X-Burguer - Duplo 2 x ${brl(18)} ${brl(36)} SEM: Cebola + Bacon extra OBS: bem passado`));
  assert.ok(t.includes(`Batata 1 x ${brl(22)} ${brl(22)}`));
  const h = html();
  assert.match(h, /<div class="nome">X-Burguer - Duplo<\/div>/);
  assert.match(h, /<div class="det">SEM: Cebola<\/div>/);
});

test('totais: subtotal, taxa de entrega e total', () => {
  const t = texto(html());
  assert.ok(t.includes(`Subtotal ${brl(58)} Taxa de entrega ${brl(6)} TOTAL ${brl(64)}`));
});

test('desconto de cashback aparece só quando existe', () => {
  assert.ok(texto(html({ ...base, descontoCashback: '3.00' })).includes(`Desconto cashback -${brl(3)}`));
  assert.doesNotMatch(texto(html()), /cashback/i);
});

test('pagamento em dinheiro: a pagar na entrega, forma, troco para e troco', () => {
  const t = texto(html());
  assert.ok(t.includes(`PAGAMENTO A PAGAR NA ENTREGA ${brl(64)} Forma de pagamento Dinheiro Troco para ${brl(100)} Troco ${brl(36)}`));
});

test('pagamento no cartão: a pagar na entrega, sem troco', () => {
  const t = texto(html(comPagamento('CARTAO')));
  assert.ok(t.includes(`A PAGAR NA ENTREGA ${brl(64)} Forma de pagamento Cartão`));
  assert.doesNotMatch(t, /Troco|PAGO/);
});

test('Pix já foi pago: consta como PAGO e nunca como "a pagar"', () => {
  const t = texto(html(comPagamento('PIX')));
  assert.match(t, /PAGAMENTO Pix PAGO/);
  assert.doesNotMatch(t, /A PAGAR|Troco|Forma de pagamento/);
  assert.doesNotMatch(texto(html(comPagamento('PIX', { trocoPara: '100.00' }))), /Troco/);
});

test('sem troco quando o valor pago é igual ao total, menor ou ausente', () => {
  for (const trocoPara of ['64.00', '50.00', null, '']) {
    assert.doesNotMatch(texto(html({ ...base, trocoPara })), /Troco/, `trocoPara=${JSON.stringify(trocoPara)}`);
  }
});

test('retirada: a pagar no balcão (dinheiro/cartão) ou PAGO (Pix)', () => {
  assert.match(texto(html(comPagamento('DINHEIRO', retirada))), /A PAGAR NO BALCÃO/);
  assert.match(texto(html(comPagamento('CARTAO', retirada))), /A PAGAR NO BALCÃO/);
  const pix = texto(html(comPagamento('PIX', retirada)));
  assert.match(pix, /Pix PAGO/);
  assert.doesNotMatch(pix, /A PAGAR/);
});

test('observação do pedido e agradecimento no rodapé', () => {
  const t = texto(html());
  assert.match(t, /OBSERVAÇÃO Tocar a campainha/);
  assert.match(t, /Obrigado pela preferência! Bom apetite! ?$/);
  assert.doesNotMatch(texto(html({ ...base, obs: null })), /OBSERVAÇÃO/);
});

test('ordem das seções do cupom', () => {
  const t = texto(html());
  const pos = (re) => { const i = t.search(re); assert.ok(i >= 0, `faltou ${re}`); return i; };
  const ordem = [pos(/NELSONS BURGUER/), pos(/COMPROVANTE DO PEDIDO/), pos(/NÃO É DOCUMENTO FISCAL/), pos(/PEDIDO #107/), pos(/CLIENTE/), pos(/ENDEREÇO DE ENTREGA/), pos(/ITENS/), pos(/Subtotal/), pos(/TOTAL/), pos(/PAGAMENTO/), pos(/OBSERVAÇÃO/), pos(/Obrigado/)];
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'seções fora de ordem');
});

test('usa o contato da conta quando o pedido não tem contato de convidado', () => {
  const t = texto(html({ ...base, nomeContato: null, telefoneContato: null, cliente: { nome: 'Cliente Cadastrado', telefone: '1233334444' } }));
  assert.match(t, /Cliente Cadastrado Tel \(12\) 3333-4444/);
});

test('papel: largura fixa em mm, margem zero e sem "size: 80mm auto" (CSS inválido)', () => {
  const h58 = html();
  assert.match(h58, /@page \{ margin: 0; \}/, 'margem 0 também remove cabeçalho/rodapé do navegador');
  assert.doesNotMatch(h58, /size:\s*80mm\s+auto/);
  assert.match(h58, /width: 100%; max-width: 58mm;\s+padding: 3mm 10mm 8mm 5mm/, '58 mm medido na KP-IM607: 5 mm esq. / 10 mm dir. = 43 mm de texto, nunca maior que a página');
  assert.match(h58, /font-family: "Courier New", "Liberation Mono"/, 'mesma fonte do teste de calibração');
  assert.doesNotMatch(h58, /@media/, 'sem media query: a largura não depende do driver');
  const h80 = montarNotinhaHtml(base, undefined, 80);
  assert.match(h80, /max-width: 72mm/, '80 mm: 72 mm úteis');
});

test('telefone e CEP não quebram no meio; valores não quebram', () => {
  const h = html();
  assert.match(h, /\.tel, \.nb \{ white-space: nowrap; \}/);
  assert.match(h, /<div class="tel">Tel \(12\) 99999-8888<\/div>/);
  assert.match(h, /<span class="nb">CEP 12345-000<\/span>/);
  assert.match(h, /\.linha span:last-child \{ white-space: nowrap;/);
});

test('só preto e branco', () => {
  const css = html().match(/<style>([\s\S]*?)<\/style>/)[1];
  const cores = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(gr[ae]y|silver)\b/g) ?? [];
  assert.ok(cores.length > 0);
  assert.deepEqual([...new Set(cores.map((c) => c.toLowerCase()))].sort(), ['#000', '#fff']);
});

test('todo texto do cliente e da loja é escapado: nada vira HTML executável', () => {
  const ataque = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  const h = montarNotinhaHtml({
    ...base,
    nomeContato: ataque, obs: ataque,
    enderecoEntregaSnapshot: { ...base.enderecoEntregaSnapshot, logradouro: ataque, complemento: ataque, bairro: ataque, cidade: ataque, uf: ataque },
    itens: [{ ...base.itens[0], nomeProdutoSnapshot: ataque, nomeVarianteSnapshot: ataque, personalizacoes: { removidos: [ataque], adicionados: [{ nome: ataque, preco: '1' }], observacao: ataque } }],
    entrega: { ...base.entrega, entregador: { id: 'x', nome: ataque } },
  }, { nome: ataque, endereco: ataque, telefone: ataque, instagram: ataque });
  // Fora do <style>/<title>, não pode sobrar nenhuma tag além das que o template cria.
  const semTemplate = h.replace(/<(\/?)(div|span|b|h2|hr|br|html|head|body|style|title|meta)\b[^>]*>/gi, '');
  assert.doesNotMatch(semTemplate, /<img|<script|onerror=\S*>/i);
  assert.doesNotMatch(h, /<script/i);
  assert.doesNotMatch(h, /<img/i);
  assert.match(h, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
});
