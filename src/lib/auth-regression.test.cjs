/* eslint-disable @typescript-eslint/no-require-imports -- Standalone regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, relative);
  const mod = new Module(filename, module);
  mod.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}

const panel = __dirname.includes('lanchonete-painel');
const kind = panel ? 'funcionario' : 'cliente';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

async function serverSession() {
  class ResponseMock {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.headers = options.headers;
      this.cookies = { values: [], set: (...args) => this.cookies.values.push(args) };
    }
    static json(body, options) { return new ResponseMock(body, options); }
  }
  const { handleBrowserSession } = load('browser-session.server.ts', { 'next/server': { NextResponse: ResponseMock } });
  const oldEnv = process.env.NODE_ENV;
  const oldApi = process.env.NEXT_PUBLIC_API_URL;
  const oldFetch = global.fetch;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test/api/v1';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ data: { accessToken: 'access', refreshToken: 'secret-refresh', expiresIn: 900, usuario: { id: '1' } } }) };
  };
  function request(action, origin = 'https://front.example.test', cookie) {
    return {
      url: 'https://front.example.test/api/session/' + action,
      headers: { get: name => ({ origin, 'x-session-intent': 'browser', authorization: 'Bearer access' })[name] || null },
      cookies: { get: () => cookie ? { value: cookie } : undefined },
      json: async () => ({ email: 'a@example.test', telefone: '11999999999', senha: 'password' }),
    };
  }
  try {
    const forbidden = await handleBrowserSession(request('login', 'https://evil.example.test'), 'login', kind);
    assert.equal(forbidden.status, 403);
    assert.equal(calls.length, 0);
    const login = await handleBrowserSession(request('login'), 'login', kind);
    assert.equal(login.status, 200);
    assert.equal(login.body.accessToken, 'access');
    assert.equal(JSON.stringify(login.body).includes('secret-refresh'), false);
    assert.equal(login.cookies.values[0][0], `__Host-lanchonete-${kind}-refresh`);
    assert.equal(login.cookies.values[0][2].httpOnly, true);
    assert.equal(login.cookies.values[0][2].secure, true);
    assert.equal(calls[0].url, `https://api.example.test/api/v1/auth/${kind}/login`);
    const refresh = await handleBrowserSession(request('refresh', undefined, 'cookie-token'), 'refresh', kind);
    assert.equal(JSON.parse(calls[1].options.body).refreshToken, 'cookie-token');
    assert.equal(JSON.stringify(refresh.body).includes('secret-refresh'), false);
    const logout = await handleBrowserSession(request('logout', undefined, 'cookie-token'), 'logout', kind);
    assert.equal(logout.status, 204);
    assert.equal(logout.cookies.values[0][2].maxAge, 0);
    const missing = await handleBrowserSession(request('refresh'), 'refresh', kind);
    assert.equal(missing.status, 401);
    const password = await handleBrowserSession(request('password'), 'password', kind);
    assert.equal(password.status, 200);
    assert.equal(calls[3].options.headers.Authorization, 'Bearer access');
    global.fetch = async () => { throw new Error('offline'); };
    const offlineLogout = await handleBrowserSession(request('logout', undefined, 'cookie-token'), 'logout', kind);
    assert.equal(offlineLogout.status, 503);
    assert.equal(offlineLogout.cookies.values[0][2].maxAge, 0);
  } finally {
    global.fetch = oldFetch;
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldApi === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = oldApi;
  }
}

async function transport() {
  const storage = new Map([['lanchonete:refreshToken', 'legacy-secret'], ['painel:refreshToken', 'legacy-secret']]);
  global.window = { location: { href: '' } };
  global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  const responseHandlers = [], retries = [];
  const api = config => { retries.push(config); return Promise.resolve({ data: {} }); };
  api.interceptors = { request: { use: () => {} }, response: { use: (ok, fail) => responseHandlers.push({ ok, fail }) } };
  let pending = deferred(), count = 0;
  const axios = { create: () => api, post: (url) => { assert.equal(url, '/api/session/refresh'); count++; return pending.promise; }, isAxiosError: () => true };
  const loaded = load('api.ts', { '@/lib/functional': load('functional.ts'), '@/lib/auth-refresh': { withRefreshLock: (_name, work) => work() }, axios });
  const set = panel ? loaded.setTokens : loaded.tokenStorage.set;
  const get = panel ? loaded.getAccessToken : loaded.tokenStorage.getAccess;
  const clear = panel ? loaded.clearTokens : loaded.tokenStorage.clear;
  const fail = responseHandlers.find(x => x.fail).fail;
  const unauthorized = () => ({ response: { status: 401 }, config: { url: '/pedidos', headers: { Authorization: 'Bearer old' } } });
  try {
    assert.equal(storage.has(panel ? 'painel:refreshToken' : 'lanchonete:refreshToken'), false);
    set('old');
    assert.equal([...storage.values()].includes('old'), false);
    const a = fail(unauthorized()), b = fail(unauthorized());
    assert.equal(count, 1);
    pending.resolve({ data: { accessToken: 'rotated' } });
    await Promise.all([a, b]);
    assert.equal(get(), 'rotated');
    assert.equal(retries.length, 2);
    pending = deferred();
    const stale = fail({ response: { status: 401 }, config: { url: '/pedidos', headers: { Authorization: 'Bearer rotated' } } });
    clear();
    pending.resolve({ data: { accessToken: 'must-not-restore' } });
    await assert.rejects(stale);
    assert.equal(get(), null);
    assert.equal(window.location.href, '');
  } finally {
    delete global.window;
    delete global.localStorage;
  }
}

(async () => { await serverSession(); await transport(); console.log('browser session regressions passed'); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
