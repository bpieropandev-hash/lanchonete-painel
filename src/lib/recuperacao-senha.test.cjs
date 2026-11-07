/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS regression runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const cache = new Map();
/** Carrega um .ts local transpilando; imports relativos também são .ts. */
function carregar(arquivo) {
  const file = path.isAbsolute(arquivo) ? arquivo : path.join(__dirname, arquivo);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const requireOriginal = mod.require.bind(mod);
  mod.require = (id) => {
    if (id.startsWith('.')) {
      const alvo = path.resolve(path.dirname(file), id);
      if (fs.existsSync(alvo + '.ts')) return carregar(alvo + '.ts');
    }
    return requireOriginal(id);
  };
  cache.set(file, mod);
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    file,
  );
  return mod.exports;
}
const { esqueciSenhaSchema, novaSenhaPorEmailSchema } = carregar('validators.ts');
const { lerTokenDoFragmento } = carregar('functional.ts');
const fonte = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('esqueci-senha valida o formato do e-mail', () => {
  assert.equal(esqueciSenhaSchema.safeParse({ email: 'dono@loja.com' }).success, true);
  assert.equal(esqueciSenhaSchema.safeParse({ email: '' }).success, false);
  assert.equal(esqueciSenhaSchema.safeParse({ email: 'sem-arroba' }).success, false);
});

test('nova senha de funcionário: 10+ caracteres, até 72 bytes, confirmação igual', () => {
  const ok = 'abcdefghij';
  assert.equal(novaSenhaPorEmailSchema.safeParse({ novaSenha: ok, confirmar: ok }).success, true);
  assert.equal(novaSenhaPorEmailSchema.safeParse({ novaSenha: 'abcdefghi', confirmar: 'abcdefghi' }).success, false);
  assert.equal(novaSenhaPorEmailSchema.safeParse({ novaSenha: ok, confirmar: ok + 'x' }).success, false);
  const acentos = 'é'.repeat(40);
  assert.equal(novaSenhaPorEmailSchema.safeParse({ novaSenha: acentos, confirmar: acentos }).success, false);
});

test('lerTokenDoFragmento lê só #t= e recusa vazio ou gigante', () => {
  assert.equal(lerTokenDoFragmento('#t=abc_DEF-123'), 'abc_DEF-123');
  assert.equal(lerTokenDoFragmento(''), null);
  assert.equal(lerTokenDoFragmento('#x=1'), null);
  assert.equal(lerTokenDoFragmento('#t='), null);
  assert.equal(lerTokenDoFragmento('#t=' + 'a'.repeat(201)), null);
});

test('a página de redefinição usa a rota de funcionário e tira o token da URL', () => {
  const src = fonte('app/redefinir-senha/page.tsx');
  assert.match(src, /auth\/funcionario\/redefinir-senha/);
  assert.match(src, /lerTokenDoFragmento\(window\.location\.hash\)/);
  assert.match(src, /history\.replaceState/);
  assert.doesNotMatch(src, /useSearchParams|location\.search/);
  assert.match(src, /clearTokens\(\)/);
});

test('esqueci-senha usa a rota de funcionário e o login tem o link', () => {
  assert.match(fonte('app/esqueci-senha/page.tsx'), /auth\/funcionario\/esqueci-senha/);
  assert.match(fonte('app/login/page.tsx'), /href="\/esqueci-senha"/);
});

test('as telas de recuperação ficam fora do grupo protegido (painel)', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'app/esqueci-senha/page.tsx')));
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'app/redefinir-senha/page.tsx')));
  assert.doesNotMatch(fonte('app/redefinir-senha/page.tsx'), /ProtectedRoute/);
});
