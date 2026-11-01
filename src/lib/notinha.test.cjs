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
const texto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');

test('entrega: número, cliente, telefone, endereço completo, cobrança e troco', () => {
  const t = texto(montarNotinhaHtml(base, 'Nelsons Burguer'));
  assert.match(t, /Nelsons Burguer/);
  assert.match(t, /#107/);
  assert.match(t, /ENTREGA/);
  assert.match(t, /Maria de Oliveira/);
  assert.match(t, /\(12\) 99999-8888/);
  assert.match(t, /Rua das Flores, 12/);
  assert.match(t, /Apto 302/);
  assert.match(t, /Centro/);
  assert.match(t, /São José\/SP - CEP 12345-000/);
  assert.match(t, /2x X-Burguer - Duplo/);
  assert.match(t, /SEM: Cebola/);
  assert.match(t, /\+ Bacon extra/);
  assert.match(t, /OBS: bem passado/);
  assert.match(t, /COBRAR/);
  assert.ok(t.includes(brl(64)), 'total a cobrar');
  assert.ok(t.includes(`Paga com ${brl(100)}`), 'valor entregue pelo cliente');
  assert.ok(t.includes(`LEVAR ${brl(36)} DE TROCO`), 'troco a levar = 100 - 64');
  assert.match(t, /OBS: Tocar a campainha/);
  assert.match(t, /Motoboy: João/);
});

test('não mostra troco quando o pagamento não é dinheiro ou não há troco a devolver', () => {
  assert.doesNotMatch(texto(montarNotinhaHtml({ ...base, pagamento: 'PIX' })), /TROCO/);
  assert.doesNotMatch(texto(montarNotinhaHtml({ ...base, trocoPara: '64.00' })), /TROCO/);
  assert.doesNotMatch(texto(montarNotinhaHtml({ ...base, trocoPara: null })), /TROCO/);
});

test('retirada: sem endereço, sem bloco COBRAR e sem taxa de entrega', () => {
  const t = texto(montarNotinhaHtml({ ...base, tipoEntrega: 'RETIRADA', enderecoEntregaSnapshot: null, taxaEntrega: '0.00' }));
  assert.match(t, /RETIRADA NO BALCÃO/);
  assert.doesNotMatch(t, /ENDEREÇO/);
  assert.doesNotMatch(t, /COBRAR/);
  assert.doesNotMatch(t, /Entrega R\$/);
  assert.match(t, /TOTAL/);
});

test('usa o contato da conta quando o pedido não tem contato de convidado', () => {
  const t = texto(montarNotinhaHtml({ ...base, nomeContato: null, telefoneContato: null, cliente: { nome: 'Cliente Cadastrado', telefone: '1233334444' } }));
  assert.match(t, /Cliente Cadastrado/);
  assert.match(t, /\(12\) 3333-4444/);
});

test('desconto de cashback aparece quando existe', () => {
  assert.ok(texto(montarNotinhaHtml({ ...base, descontoCashback: '3.00' })).includes(`Desconto cashback -${brl(3)}`));
  assert.doesNotMatch(texto(montarNotinhaHtml(base)), /cashback/i);
});

test('todo texto do cliente é escapado: nada vira HTML executável', () => {
  const ataque = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  const html = montarNotinhaHtml({
    ...base,
    nomeContato: ataque, obs: ataque,
    enderecoEntregaSnapshot: { ...base.enderecoEntregaSnapshot, logradouro: ataque, complemento: ataque, bairro: ataque },
    itens: [{ ...base.itens[0], nomeProdutoSnapshot: ataque, personalizacoes: { removidos: [ataque], adicionados: [{ nome: ataque, preco: '1' }], observacao: ataque } }],
    entrega: { ...base.entrega, entregador: { id: 'x', nome: ataque } },
  }, ataque);
  // Fora do <style>/<title>, não pode sobrar nenhuma tag além das que o template cria.
  const semTemplate = html.replace(/<(\/?)(div|span|b|h2|hr|br|html|head|body|style|title|meta)\b[^>]*>/gi, '');
  assert.doesNotMatch(semTemplate, /<img|<script|onerror=\S*>/i);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
});
