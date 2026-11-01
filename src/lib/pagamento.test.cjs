/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const arquivo = path.resolve(__dirname, 'pagamento.ts');
const mod = new Module(arquivo, module);
mod._compile(
  ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  arquivo
);
const { cobrancaDoPedido } = mod.exports;

test('Pix já foi pago: não se cobra nada', () => {
  assert.deepEqual(cobrancaDoPedido({ pagamento: 'PIX', total: '64.00', trocoPara: null }), { cobrar: false, troco: null });
});

test('Pix nunca tem troco, nem se o campo vier preenchido', () => {
  assert.deepEqual(cobrancaDoPedido({ pagamento: 'PIX', total: '64.00', trocoPara: '100.00' }), { cobrar: false, troco: null });
});

test('cartão é cobrado na entrega e não tem troco', () => {
  assert.deepEqual(cobrancaDoPedido({ pagamento: 'CARTAO', total: '64.00', trocoPara: null }), { cobrar: true, troco: null });
  assert.deepEqual(cobrancaDoPedido({ pagamento: 'CARTAO', total: '64.00', trocoPara: '100.00' }), { cobrar: true, troco: null });
});

test('dinheiro é cobrado; troco = valor pago - total', () => {
  assert.deepEqual(cobrancaDoPedido({ pagamento: 'DINHEIRO', total: '64.00', trocoPara: '100.00' }), { cobrar: true, troco: 36 });
});

test('dinheiro sem troco: valor pago igual ao total, ausente ou menor', () => {
  for (const trocoPara of ['64.00', null, '', '50.00']) {
    assert.deepEqual(cobrancaDoPedido({ pagamento: 'DINHEIRO', total: '64.00', trocoPara }), { cobrar: true, troco: null }, `trocoPara=${JSON.stringify(trocoPara)}`);
  }
});
