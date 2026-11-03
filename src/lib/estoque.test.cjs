/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function carregar(arquivo) {
  const caminho = path.resolve(__dirname, arquivo);
  const mod = new Module(caminho, module);
  mod._compile(
    ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    caminho
  );
  return mod.exports;
}

const e = carregar('estoque.ts');
const rotas = carregar('painel-routes.ts');

test('lerDecimal: vírgula é a decimal e ponto de milhar é ignorado', () => {
  assert.equal(e.lerDecimal('0,5'), 0.5);
  assert.equal(e.lerDecimal('1.234,56'), 1234.56);
  assert.equal(e.lerDecimal('1234,56'), 1234.56);
  assert.equal(e.lerDecimal('R$ 250,00'), 250);
  assert.equal(e.lerDecimal('  7 '), 7);
  assert.equal(e.lerDecimal('2.400.000'), 2400000);
});

test('lerDecimal: ponto sozinho é milhar só no padrão 1.500; senão é decimal', () => {
  assert.equal(e.lerDecimal('1.500'), 1500);
  assert.equal(e.lerDecimal('1.5'), 1.5);
  assert.equal(e.lerDecimal('0.500'), 0.5); // começa com zero: decimal, nunca milhar
  assert.equal(e.lerDecimal('12.345'), 12345);
  assert.equal(e.lerDecimal('3.14'), 3.14);
});

test('lerDecimal: recusa lixo, negativo (por padrão) e notação científica', () => {
  for (const ruim of ['', '   ', 'abc', '1,2,3', '1e3', '--1', '1..5', '0,5,', ',5', '5,']) {
    assert.equal(e.lerDecimal(ruim), null, `deveria recusar "${ruim}"`);
  }
  assert.equal(e.lerDecimal('-5'), null);
  assert.equal(e.lerDecimal('-5', { permitirNegativo: true }), -5);
  assert.equal(e.lerDecimal('-1.250,5', { permitirNegativo: true }), -1250.5);
});

test('validarDecimal: mensagens em português para cada tipo de erro', () => {
  const base = { rotulo: 'Quantidade', casas: 3, min: 0, minExclusivo: true, max: 1_000_000 };
  assert.deepEqual(e.validarDecimal('120', base), { ok: true, valor: 120 });
  assert.deepEqual(e.validarDecimal('0,001', base), { ok: true, valor: 0.001 });
  assert.match(e.validarDecimal('abc', base).erro, /informe um número/);
  assert.match(e.validarDecimal('0', base).erro, /maior que 0/);
  assert.match(e.validarDecimal('0,0001', base).erro, /no máximo 3 casas/);
  assert.match(e.validarDecimal('1.000.001', base).erro, /não pode passar de 1\.000\.000/);
  assert.match(e.validarDecimal('5', { ...base, casas: 0, min: 10 }).erro, /não pode ser menor|maior que/);
});

test('validarDecimal: variação com sinal não aceita zero', () => {
  const op = { rotulo: 'Variação', casas: 3, min: -1000, max: 1000, permitirNegativo: true, naoZero: true };
  assert.deepEqual(e.validarDecimal('-50', op), { ok: true, valor: -50 });
  assert.match(e.validarDecimal('0', op).erro, /não pode ser zero/);
  assert.match(e.validarDecimal('-1.001', op).erro, /não pode ser menor que -1\.000/);
  assert.match(e.validarDecimal('1.000,5', op).erro, /não pode passar de 1\.000/);
});

test('conversão de unidade: 5 kg viram 5.000 g e o custo acompanha', () => {
  assert.equal(e.converterParaBase(5, true, 1000), 5000);
  assert.equal(e.converterParaBase(5, false, 1000), 5);
  assert.equal(e.converterParaBase(0.25, true, 1000), 250);
  assert.equal(e.custoPorUnidadeBase(44, 1000), 0.044); // R$ 44/kg = R$ 0,044/g
  assert.equal(e.custoPorUnidadeCompra(0.044, 1000), 44);
  assert.equal(e.custoPorUnidadeBase(10, 3), 3.333333); // 6 casas
  assert.equal(e.custoPorUnidadeBase(7, 0), 7); // fator inválido não divide por zero
});

test('previaDaCompra: exemplo da spec — 1.000 g a R$ 0,040 + 5.000 g por R$ 250 = R$ 0,048333', () => {
  const p = e.previaDaCompra({ saldo: 1000, custoMedio: 0.04, quantidadeBase: 5000, valorTotal: 250 });
  assert.equal(p.precoPorUnidadeBase, 0.05);
  assert.equal(p.novoCustoMedio, 0.048333);
});

test('previaDaCompra: saldo zero ou negativo não pesa no custo', () => {
  assert.equal(
    e.previaDaCompra({ saldo: 0, custoMedio: 0.1, quantidadeBase: 3000, valorTotal: 132 }).novoCustoMedio,
    0.044
  );
  assert.equal(
    e.previaDaCompra({ saldo: -200, custoMedio: 0.1, quantidadeBase: 1000, valorTotal: 50 }).novoCustoMedio,
    0.05
  );
  assert.equal(
    e.previaDaCompra({ saldo: 3, custoMedio: 3.333333, quantidadeBase: 3, valorTotal: 20 }).novoCustoMedio,
    5
  );
});

test('formatação de quantidades em pt-BR', () => {
  assert.equal(e.formatarNumero('2400.000'), '2.400');
  assert.equal(e.formatarNumero('0.500'), '0,5');
  assert.equal(e.formatarNumero(1234.5678), '1.234,568');
  assert.equal(e.formatarNumero(null), '0');
  assert.equal(e.formatarQuantidade('2400.000', 'G'), '2.400 g');
  assert.equal(e.formatarQuantidade('30.000', 'UN'), '30 un');
  assert.equal(e.formatarQuantidade('1.500', 'ML'), '1,5 ml');
});

test('formatarVariacao: sinal explícito para o extrato', () => {
  assert.equal(e.formatarVariacao('5000.000', 'G'), '+5.000 g');
  assert.equal(e.formatarVariacao('-120.000', 'G'), '−120 g');
  assert.equal(e.formatarVariacao('0.000', 'UN'), '0 un');
  assert.equal(e.entradaOuSaida('-1'), 'saida');
  assert.equal(e.entradaOuSaida('2'), 'entrada');
  assert.equal(e.entradaOuSaida('0.000'), 'zero');
});

test('custo unitário mostra até 4 casas', () => {
  assert.match(e.formatarCustoUnitario('0.044000'), /R\$\s0,044/);
  assert.match(e.formatarCustoUnitario('1.2'), /R\$\s1,20/);
});

test('textoCapacidade: o texto da aba Fichas', () => {
  assert.equal(
    e.textoCapacidade({ semFicha: false, capacidade: 15, limitante: { insumoId: 'a', nome: 'Alface' } }),
    'Dá para fazer 15 (limita: Alface)'
  );
  assert.equal(e.textoCapacidade({ semFicha: true, capacidade: null, limitante: null }), 'Sem ficha técnica');
  assert.equal(
    e.textoCapacidade({ semFicha: false, capacidade: 0, limitante: { insumoId: 'q', nome: 'Queijo' } }),
    'Dá para fazer 0 (limita: Queijo)'
  );
  assert.equal(e.textoCapacidade({ semFicha: false, capacidade: 1200, limitante: null }), 'Dá para fazer 1.200');
});

test('textoCustoIncompleto: diz qual insumo falta comprar', () => {
  assert.equal(
    e.textoCustoIncompleto({ custoIncompleto: true, insumosSemCusto: ['Queijo', 'Alface'] }),
    'Custo incompleto: falta comprar Queijo, Alface'
  );
  assert.equal(e.textoCustoIncompleto({ custoIncompleto: false, insumosSemCusto: [] }), null);
});

test('o menu Estoque só aparece com o módulo habilitado e para ADMIN/ATENDENTE', () => {
  const on = { habilitado: true };
  const off = { habilitado: false };
  assert.equal(e.menuEstoqueVisivel('ADMIN', on), true);
  assert.equal(e.menuEstoqueVisivel('ATENDENTE', on), true);
  assert.equal(e.menuEstoqueVisivel('ADMIN', off), false, 'desabilitado: o painel fica como antes');
  assert.equal(e.menuEstoqueVisivel('ADMIN', null), false, 'estado desconhecido: esconde');
  assert.equal(e.menuEstoqueVisivel('CHAPEIRO', on), false);
  assert.equal(e.menuEstoqueVisivel('ENTREGADOR', on), false);
  assert.equal(e.menuEstoqueVisivel(undefined, on), false);
});

test('só o ADMIN vê custos', () => {
  assert.equal(e.podeVerCustos('ADMIN'), true);
  for (const p of ['ATENDENTE', 'CHAPEIRO', 'ENTREGADOR', undefined]) assert.equal(e.podeVerCustos(p), false);
});

test('rota /estoque: ADMIN e ATENDENTE entram; cozinha e entregador não', () => {
  assert.equal(rotas.isPainelRouteAllowed('ADMIN', '/estoque'), true);
  assert.equal(rotas.isPainelRouteAllowed('ATENDENTE', '/estoque'), true);
  assert.equal(rotas.isPainelRouteAllowed('CHAPEIRO', '/estoque'), false);
  assert.equal(rotas.isPainelRouteAllowed('ENTREGADOR', '/estoque'), false);
  // Não pode abrir portas por prefixo parecido.
  assert.equal(rotas.isPainelRouteAllowed('ATENDENTE', '/estoquefalso'), false);
});
