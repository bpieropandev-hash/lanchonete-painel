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
const { formatDataHora } = carregar('format');

const AGORA = new Date('2026-11-01T18:12:00Z');
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
    { id: 'i1', nomeProdutoSnapshot: 'X-Burguer', nomeVarianteSnapshot: 'Duplo', quantidade: 2, subtotal: '36.00',
      personalizacoes: { removidos: ['Cebola'], adicionados: [{ nome: 'Bacon extra', preco: '4.00' }], observacao: 'bem passado' } },
    { id: 'i2', nomeProdutoSnapshot: 'Batata', nomeVarianteSnapshot: null, quantidade: 1, subtotal: '22.00', personalizacoes: null },
  ],
  criadoEm: '2026-11-01T15:00:00.000Z', atualizadoEm: '2026-11-01T15:00:00.000Z',
};
const dinheiro = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// formatBRL usa espaço não separável (U+00A0) entre R$ e o valor.
const brl = (v) => dinheiro(v).replace(/\s/g, ' ');
const html = (pedido = base, loja = 'Nelsons Burguer') => montarNotinhaHtml(pedido, loja, AGORA);
const texto = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');

test('entrega: identificação da via, número, cliente, endereço completo e itens', () => {
  const t = texto(html());
  assert.match(t, /NELSONS BURGUER/);
  assert.match(t, /VIA DO ENTREGADOR/);
  assert.match(t, /#107/);
  assert.match(t, /ENTREGA/);
  assert.match(t, /Maria de Oliveira/);
  assert.match(t, /Tel \(12\) 99999-8888/);
  assert.match(t, /Rua das Flores, 12/);
  assert.match(t, /Apto 302/);
  assert.match(t, /Centro/);
  assert.match(t, /São José\/SP · CEP 12345-000/);
  assert.match(t, /2x X-Burguer - Duplo /);
  assert.match(t, /SEM: Cebola/);
  assert.match(t, /\+ Bacon extra/);
  assert.match(t, /OBS: bem passado/);
  assert.match(t, /OBS: Tocar a campainha/);
  assert.match(t, /Entregador: João/);
});

test('número do pedido com 3 dígitos, como na tela do entregador', () => {
  assert.match(texto(html({ ...base, numero: 7 })), /#007/);
  assert.match(html({ ...base, numero: 7 }), /<title>Pedido #007<\/title>/);
  assert.match(texto(html({ ...base, numero: 1234 })), /#1234/);
});

test('ordem das seções: o que o entregador precisa vem antes de itens e totais', () => {
  const t = texto(html());
  const pos = (re) => { const i = t.search(re); assert.ok(i >= 0, `faltou ${re}`); return i; };
  const ordem = [pos(/#107/), pos(/CLIENTE/), pos(/ENDEREÇO/), pos(/COBRAR/), pos(/LEVAR/), pos(/OBS: Tocar/), pos(/ITENS/), pos(/Subtotal/), pos(/TOTAL/), pos(/NÃO É DOCUMENTO FISCAL/)];
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'seções fora de ordem');
});

test('cobrança: valor, forma de pagamento e troco a levar (100 - 64)', () => {
  const t = texto(html());
  assert.match(t, /COBRAR/);
  assert.ok(t.includes(brl(64)), 'total a cobrar');
  assert.match(t, /DINHEIRO|Dinheiro/);
  assert.ok(t.includes(`Paga com ${brl(100)}`), 'valor entregue pelo cliente');
  assert.ok(t.includes(`LEVAR ${brl(36)} DE TROCO`), 'troco a levar');
});

test('não mostra troco quando o pagamento não é dinheiro ou não há troco a devolver', () => {
  assert.doesNotMatch(texto(html({ ...base, pagamento: 'PIX' })), /TROCO/);
  assert.doesNotMatch(texto(html({ ...base, trocoPara: '64.00' })), /TROCO/);
  assert.doesNotMatch(texto(html({ ...base, trocoPara: null })), /TROCO/);
});

test('itens em colunas QTD / ITEM / VALOR: quantidade e valor em células próprias', () => {
  const h = html();
  assert.match(h, /<div class="item"><span>2x<\/span><span>X-Burguer - Duplo<\/span><span class="val">/);
  assert.match(h, /<div class="item"><span>1x<\/span><span>Batata<\/span>/);
  assert.match(h, /\.val \{ white-space: nowrap; text-align: right; \}/, 'valores não quebram no meio');
});

test('totais: subtotal, taxa de entrega e total, alinhados à direita', () => {
  const t = texto(html());
  assert.ok(t.includes(`Subtotal ${brl(58)}`));
  assert.ok(t.includes(`Taxa de entrega ${brl(6)}`));
  assert.ok(t.includes(`TOTAL ${brl(64)}`));
});

test('retirada: via do balcão, sem endereço, sem bloco COBRAR e sem taxa de entrega', () => {
  const t = texto(html({ ...base, tipoEntrega: 'RETIRADA', enderecoEntregaSnapshot: null, taxaEntrega: '0.00' }));
  assert.match(t, /VIA DO BALCÃO/);
  assert.match(t, /RETIRADA NO BALCÃO/);
  assert.doesNotMatch(t, /VIA DO ENTREGADOR/);
  assert.doesNotMatch(t, /ENDEREÇO/);
  assert.doesNotMatch(t, /COBRAR/);
  assert.doesNotMatch(t, /Taxa de entrega/);
  assert.match(t, /TOTAL/);
  assert.match(t, /Pagamento Dinheiro/);
});

test('rodapé: via de controle interno, aviso de documento não fiscal e hora da impressão', () => {
  const t = texto(html());
  assert.match(t, /NÃO É DOCUMENTO FISCAL/);
  assert.match(t, /Via de controle interno/);
  assert.ok(t.includes(`Impresso em ${formatDataHora(AGORA)}`));
  assert.ok(t.lastIndexOf('NÃO É DOCUMENTO FISCAL') > t.indexOf('TOTAL'), 'aviso fica no fim');
});

test('usa o contato da conta quando o pedido não tem contato de convidado', () => {
  const t = texto(html({ ...base, nomeContato: null, telefoneContato: null, cliente: { nome: 'Cliente Cadastrado', telefone: '1233334444' } }));
  assert.match(t, /Cliente Cadastrado/);
  assert.match(t, /\(12\) 3333-4444/);
});

test('desconto de cashback aparece quando existe', () => {
  assert.ok(texto(html({ ...base, descontoCashback: '3.00' })).includes(`Desconto cashback -${brl(3)}`));
  assert.doesNotMatch(texto(html()), /cashback/i);
});

test('papel: largura útil, margem zero e sem "size: 80mm auto" (CSS inválido)', () => {
  const h = html();
  assert.match(h, /@page \{ margin: 0; \}/, 'margem 0 também remove cabeçalho/rodapé do navegador');
  assert.doesNotMatch(h, /size:\s*80mm\s+auto/);
  assert.match(h, /max-width: 80mm/);
  assert.match(h, /padding: 3mm 4mm 8mm/, '4 mm de cada lado = 72 mm úteis em 80 mm');
  assert.match(h, /@media \(max-width: 64mm\)/, 'ajuste para papel de 58 mm');
});

test('papel de 58 mm: o bloco @media vem DEPOIS das regras base (senão não vence na cascata)', () => {
  const h = html();
  const media = h.indexOf('@media (max-width: 64mm)');
  for (const regra of ['.numero {', '.grande {', '.troco {', '.item {', '.total {', '.cobrar .valor {']) {
    assert.ok(media > h.indexOf(regra), `${regra} precisa vir antes do @media`);
  }
  for (const regra of ['.numero { font-size', '.grande { font-size', '.troco { font-size']) {
    assert.ok(h.indexOf(regra, media) > media, `@media deve redefinir ${regra}`);
  }
});

test('telefone e CEP não quebram no meio', () => {
  const h = html();
  assert.match(h, /\.tel, \.nb \{ white-space: nowrap; \}/);
  assert.match(h, /<div class="grande tel">Tel \(12\) 99999-8888<\/div>/);
  assert.match(h, /<span class="nb">CEP 12345-000<\/span>/);
});

test('só preto e branco, e o fundo preto da faixa é impresso (print-color-adjust)', () => {
  const css = html().match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css, /print-color-adjust: exact/);
  const cores = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(gr[ae]y|silver)\b/g) ?? [];
  assert.ok(cores.length > 0);
  assert.deepEqual([...new Set(cores.map((c) => c.toLowerCase()))].sort(), ['#000', '#fff']);
});

test('todo texto do cliente é escapado: nada vira HTML executável', () => {
  const ataque = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  const h = montarNotinhaHtml({
    ...base,
    nomeContato: ataque, obs: ataque,
    enderecoEntregaSnapshot: { ...base.enderecoEntregaSnapshot, logradouro: ataque, complemento: ataque, bairro: ataque, cidade: ataque, uf: ataque },
    itens: [{ ...base.itens[0], nomeProdutoSnapshot: ataque, nomeVarianteSnapshot: ataque, personalizacoes: { removidos: [ataque], adicionados: [{ nome: ataque, preco: '1' }], observacao: ataque } }],
    entrega: { ...base.entrega, entregador: { id: 'x', nome: ataque } },
  }, ataque, AGORA);
  // Fora do <style>/<title>, não pode sobrar nenhuma tag além das que o template cria.
  const semTemplate = h.replace(/<(\/?)(div|span|b|h2|hr|br|html|head|body|style|title|meta)\b[^>]*>/gi, '');
  assert.doesNotMatch(semTemplate, /<img|<script|onerror=\S*>/i);
  assert.doesNotMatch(h, /<script/i);
  assert.doesNotMatch(h, /<img/i);
  assert.match(h, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
});
