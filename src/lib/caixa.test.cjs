/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const file = path.resolve(__dirname, 'caixa.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, file);
const { lerValorCaixa, periodoValido, distribuicaoPagamentos } = mod.exports;

test('valores de fechamento são lidos em centavos sem aceitar entradas ambíguas', () => {
  assert.equal(lerValorCaixa('1.234,56', 1000000), 1234.56);
  assert.equal(lerValorCaixa('0,50', 1000000), 0.5);
  assert.equal(lerValorCaixa('0', 1000000), 0);
  for (const entrada of ['', '-10', '1e3', '1,234', '1.23', '10,', 'NaN', '1.000.000,01']) {
    assert.equal(lerValorCaixa(entrada, 1000000), null, entrada);
  }
});

test('períodos inválidos ou invertidos são rejeitados antes da busca', () => {
  assert.equal(periodoValido('2026-11-01', '2026-11-05'), true);
  assert.equal(periodoValido('2026-11-05', '2026-11-01'), false);
  assert.equal(periodoValido('2026-02-31', '2026-03-01'), false);
  assert.equal(periodoValido('2026-01-01', '2027-01-03'), false);
});

test('distribuição usa o total do servidor e nunca divide por zero', () => {
  assert.deepEqual(distribuicaoPagamentos({ totalGeral: 200, totalPix: 100, totalDinheiro: 60, totalCartao: 40 }), [50, 30, 20]);
  assert.deepEqual(distribuicaoPagamentos({ totalGeral: 0, totalPix: 0, totalDinheiro: 0, totalCartao: 0 }), [0, 0, 0]);
});
