/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS regression runner. */
/* Runs real TypeScript modules with controlled HTTP/storage boundaries, no browser/server. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, relative);
  const mod = new Module(filename, module);
  mod.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const helpers = load('functional.ts');
const panel = __dirname.includes('lanchonete-painel');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
async function stores() {
  let access = 'old-access', refresh = 'old-refresh';
  const events = [];
  let get = async () => { throw {response: {status: 503}}; };
  let post = async () => ({data:{ accessToken:'new-access', refreshToken:'new-refresh', usuario:{id:'NEW',nome:'New',perfil:'ADMIN'} }});
  const clear = () => {events.push('clear'); access = refresh = null;};
  const set = (a,r) => { access=a;refresh=r; };
  const boundary = { api: {get:(...args)=>get(...args),post:(...args)=>post(...args)}, tokenStorage:{getAccess:()=>access,getRefresh:()=>refresh,clear,set}, clearTokens:clear,getAccessToken:()=>access,getRefreshToken:()=>refresh,setTokens:set,extractApiError:()=> 'failure' };
  let state;
  const zustand = {create: (factory) => {state = factory((next)=>Object.assign(state,next),()=>state); return state;}};
  load('../store/authStore.ts', {'@/lib/functional':helpers,'@/lib/api':boundary,zustand});
  await state.hydrate(); assert.equal(refresh,'old-refresh'); assert.ok(state.hydrationError);
  get = async () => { throw {response: {status:401}}; };
  await state.hydrate(); assert.equal(refresh,null); assert.equal(state.isAuthenticated,false);
  set('old-access','old-refresh');
  const old = deferred(); get=()=>old.promise;
  const hydrating = state.hydrate();
  assert.equal(state.hydrate(), hydrating, "hydrate is deduplicated");
  await state.login('123','password');
  old.resolve({data:{id:'OLD',nome:'Old'}}); await hydrating;
  assert.equal((state.funcionario || state.cliente).id,'NEW');
  const pending = deferred(); get=()=>pending.promise;
  const beforeLogout = state.hydrate();
  post = (url,body) => { assert.equal(url,'/auth/logout'); assert.deepEqual(body,{refreshToken:'new-refresh'}); assert.equal(refresh,'new-refresh'); events.push('logout'); return Promise.reject(new Error('offline')); };
  state.logout(); assert.equal(refresh,null); assert.deepEqual(events.slice(-2),['logout','clear']);
  pending.resolve({data:{id:'OLD'}}); await beforeLogout;
  assert.equal(state.isAuthenticated,false); assert.equal(panel ? state.funcionario : state.cliente,null);
}
async function transport() {
  const storage = new Map();
  global.window={location:{href:''}};
  global.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const responses=[]; const retries=[];
  const api = config => {retries.push(config);return Promise.resolve({data:{id:'ME'}});};
  api.interceptors={request:{use:()=>{}},response:{use:(ok,fail)=>responses.push({ok,fail})}};
  let refreshRequest=deferred(), count=0;
  const axios={create:()=>api,post:()=>{count++;return refreshRequest.promise;},isAxiosError:()=>true};
  const loaded=load('api.ts',{'@/lib/functional':helpers,'@/lib/auth-refresh':{withRefreshLock:(_name,work)=>work()},axios});
  const tokens=panel ? {set:loaded.setTokens,getRefresh:loaded.getRefreshToken,clear:loaded.clearTokens}:loaded.tokenStorage;
  const fail=responses.find(x=>x.fail).fail;
  const unauthorized=(url)=>({response:{status:401},config:{url,headers:{Authorization:`Bearer ${panel ? loaded.getAccessToken() : loaded.tokenStorage.getAccess()}`}}});
  tokens.set('a','r');
  const first=fail(unauthorized(panel?'/auth/me':'/auth/me/cliente'));
  const second=fail(unauthorized('/pedidos'));
  assert.equal(count,1);
  refreshRequest.resolve({data:{data:{accessToken:'a2',refreshToken:'r2'}}});
  await Promise.all([first,second]);
  assert.equal(tokens.getRefresh(),'r2'); assert.equal(retries.length,2);
  assert.ok(retries.every(x=>x._retry));
  // A transient refresh error must not log out or redirect.
  refreshRequest=deferred();
  const unavailable=fail(unauthorized('/pedidos'));
  refreshRequest.reject({response:{status:503}}); await assert.rejects(unavailable);
  assert.equal(tokens.getRefresh(),'r2'); assert.equal(window.location.href,'');
  // A late rejected refresh belonging to the old session cannot clear a new login.
  refreshRequest=deferred();
  const stale=fail(unauthorized('/pedidos'));
  tokens.set('new-session','new-session-refresh');
  refreshRequest.reject({response:{status:401}}); await assert.rejects(stale);
  assert.equal(tokens.getRefresh(),'new-session-refresh');
  const calls=count;
  await assert.rejects(fail(unauthorized('/auth/logout'))); assert.equal(count,calls);
  if (!panel) { await assert.rejects(fail(unauthorized('/pedidos/convidado/ID'))); assert.equal(count,calls); }
  delete global.window; delete global.localStorage;
}
async function tabs() {
  const storage=new Map();
  global.window={location:{href:''}};
  global.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const previousNavigator=Object.getOwnPropertyDescriptor(global,'navigator');
  let tail=Promise.resolve();
  Object.defineProperty(global,'navigator',{configurable:true,value:{locks:{request:(_name,work)=>{const task=tail.then(work);tail=task.catch(()=>{});return task;}}}});
  const coordination=load('auth-refresh.ts');
  const pending=deferred();let rotations=0;
  function tab(){
    let reject401;
    const api=config=>Promise.resolve({data:config.headers.Authorization});
    api.interceptors={request:{use:()=>{}},response:{use:(_ok,fail)=>{if(fail)reject401=fail;}}};
    const axios={create:()=>api,post:()=>{rotations++;return pending.promise;},isAxiosError:()=>true};
    const loadedTab=load('api.ts',{'@/lib/functional':helpers,'@/lib/auth-refresh':coordination,axios});
    const tokens=panel?{set:loadedTab.setTokens,getRefresh:loadedTab.getRefreshToken,clear:loadedTab.clearTokens}:loadedTab.tokenStorage;
    return {tokens,reject401};
  }
  const A=tab(),B=tab();A.tokens.set('old','single-use');
  const unauthorized=()=>({response:{status:401},config:{url:panel?'/auth/me':'/auth/me/cliente',headers:{Authorization:'Bearer old'}}});
  const a=A.reject401(unauthorized()),b=B.reject401(unauthorized());
  await new Promise(r=>setImmediate(r));assert.equal(rotations,1);
  pending.resolve({data:{accessToken:'rotated',refreshToken:'rotated-refresh'}});
  const result=await Promise.all([a,b]);assert.equal(rotations,1,'two tabs rotate once');
  assert.ok(result.every(x=>x.data==='Bearer rotated'));
  await B.reject401(unauthorized());assert.equal(rotations,1,'late old 401 reuses current access');
  // A successful old refresh after logout must never restore its family.
  A.tokens.set('old','single-use');
  const late=deferred();
  let rejectLate;
  const lateApi=config=>Promise.resolve(config);
  lateApi.interceptors={request:{use:()=>{}},response:{use:(_ok,fail)=>{if(fail)rejectLate=fail;}}};
  load('api.ts',{'@/lib/functional':helpers,'@/lib/auth-refresh':coordination,axios:{create:()=>lateApi,post:()=>late.promise}});
  const response=rejectLate(unauthorized());await new Promise(r=>setImmediate(r));A.tokens.clear();
  late.resolve({data:{accessToken:'must-not-restore',refreshToken:'must-not-restore'}});
  await assert.rejects(response);assert.equal(A.tokens.getRefresh(),null);
  // Older browsers share a storage lease rather than rotating concurrently.
  Object.defineProperty(global,'navigator',{configurable:true,value:{}});
  let running=0, peak=0;
  const work=async()=>{running++;peak=Math.max(peak,running);await new Promise(r=>setTimeout(r,10));running--;};
  await Promise.all([coordination.withRefreshLock('test-fallback',work),coordination.withRefreshLock('test-fallback',work)]);
  assert.equal(peak,1);assert.equal(storage.has('test-fallback:lease'),false);
  if(previousNavigator)Object.defineProperty(global,'navigator',previousNavigator);else delete global.navigator;
  delete global.window;delete global.localStorage;
}
(async()=>{await stores();await transport();await tabs();console.log('auth store/transport regressions passed');})().catch(error=>{console.error(error);process.exitCode=1;});
