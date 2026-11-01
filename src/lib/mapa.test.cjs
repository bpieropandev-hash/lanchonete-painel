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
const { enderecoParaBusca, linkMapa } = carregar('mapa');

const base = {
  logradouro: 'Rua das Flores', numero: '123', complemento: 'Apto 302 bloco B',
  bairro: 'Centro', cidade: 'São José dos Campos', uf: 'SP', cep: '12345000',
};

test('com CEP: rua, número, cidade - UF, CEP e Brasil; sem bairro nem complemento', () => {
  assert.equal(enderecoParaBusca(base), 'Rua das Flores, 123, São José dos Campos - SP, 12345-000, Brasil');
});

test('CEP já formatado também é aceito', () => {
  assert.equal(enderecoParaBusca({ ...base, cep: '12345-000' }), 'Rua das Flores, 123, São José dos Campos - SP, 12345-000, Brasil');
});

test('sem CEP: o bairro entra para diferenciar ruas de mesmo nome', () => {
  for (const cep of [null, undefined, '', '123', 'abc']) {
    assert.equal(enderecoParaBusca({ ...base, cep }), 'Rua das Flores, 123, Centro, São José dos Campos - SP, Brasil', `cep=${JSON.stringify(cep)}`);
  }
});

test('o complemento nunca entra na busca', () => {
  assert.doesNotMatch(enderecoParaBusca(base), /Apto|bloco/i);
});

test('número "sem número" é descartado e a busca fica só pela rua', () => {
  for (const numero of ['S/N', 's/n', 'SN', 'sn', 's.n.', 'S N', 'sem número', 'Sem Numero', '', '   ', null, undefined]) {
    assert.equal(
      enderecoParaBusca({ ...base, numero }),
      'Rua das Flores, São José dos Campos - SP, 12345-000, Brasil',
      `numero=${JSON.stringify(numero)}`
    );
  }
});

test('número com texto junto fica só com o número da casa', () => {
  assert.match(enderecoParaBusca({ ...base, numero: '123 casa 2' }), /^Rua das Flores, 123, /);
  assert.match(enderecoParaBusca({ ...base, numero: '45, fundos' }), /^Rua das Flores, 45, /);
  assert.match(enderecoParaBusca({ ...base, numero: ' 78 ' }), /^Rua das Flores, 78, /);
  assert.match(enderecoParaBusca({ ...base, numero: '123A' }), /^Rua das Flores, 123A, /);
});

test('dados faltando nunca geram "undefined", "null" nem vírgulas soltas', () => {
  const q = enderecoParaBusca({ logradouro: 'Rua X', numero: '1' });
  assert.equal(q, 'Rua X, 1, Brasil');
  assert.doesNotMatch(enderecoParaBusca({ ...base, cidade: undefined, uf: undefined, bairro: null, cep: null }), /undefined|null|,\s*,|-\s*,|,\s*-/);
  assert.doesNotMatch(enderecoParaBusca({}), /undefined|null/);
});

test('UF em minúsculas é normalizada e espaços são aparados', () => {
  assert.equal(
    enderecoParaBusca({ ...base, logradouro: '  Rua das Flores  ', uf: 'sp ' }),
    'Rua das Flores, 123, São José dos Campos - SP, 12345-000, Brasil'
  );
});

test('o link é uma busca do Google Maps com o texto codificado', () => {
  const url = new URL(linkMapa(base));
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('query'), enderecoParaBusca(base));
  assert.doesNotMatch(linkMapa(base), / /, 'sem espaços crus na URL');
});

test('caracteres especiais no endereço não quebram a URL nem injetam parâmetros', () => {
  const url = new URL(linkMapa({ ...base, logradouro: 'Rua A&B #1 ?x=1', cidade: 'São Paulo' }));
  assert.equal(url.searchParams.get('api'), '1');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['api', 'query']);
  assert.match(url.searchParams.get('query'), /Rua A&B #1 \?x=1/);
});
