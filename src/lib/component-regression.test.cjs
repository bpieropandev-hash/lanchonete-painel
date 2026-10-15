/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS regression runner. */
/* Deterministic hook harness for race ordering; browser coverage is coordinated separately. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const panel = __dirname.includes('lanchonete-painel');
const deferred = () => {let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
let active;
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const react={
  useState(initial){const h=active, i=h.index++;if(!(i in h.slots))h.slots[i]=initial;return [h.slots[i],value=>{if(h.dead){h.staleWrites++;return;}h.slots[i]=typeof value==='function'?value(h.slots[i]):value;h.dirty=true;}];},
  useRef(initial){const h=active,i=h.index++;return h.slots[i]??(h.slots[i]={current:initial});},
  useEffect(fn,deps){const h=active,i=h.index++,old=h.slots[i];if(!old||!same(old.deps,deps))h.effects.push(()=>{old?.cleanup?.();h.slots[i]={deps,fn,cleanup:fn()};});},
  useCallback(fn,deps){const h=active,i=h.index++,old=h.slots[i];if(!old||!same(old.deps,deps))h.slots[i]={deps,fn};return h.slots[i].fn;},
};
function harness(component,props){
 const h={slots:[],effects:[],index:0,dirty:false,dead:false,staleWrites:0,tree:null};
 h.render=()=>{h.dirty=false;h.index=0;active=h;h.tree=component(props);h.effects.splice(0).forEach(fn=>fn());return h.tree;};
 h.settle=()=>{for(let n=0;h.dirty&&n<10;n++)h.render();};
 h.replayEffects=()=>{h.slots.forEach(s=>{if(s?.fn && s?.deps){s.cleanup?.();s.cleanup=s.fn();}});};
 h.unmount=()=>{h.dead=true;h.slots.forEach(s=>s?.cleanup?.());};
 h.render();return h;
}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children,node.props?.footer].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
async function run(){
 const requests=[],sockets=[],patches=[],updates=[];let closes=0;
 const saved=new Map();
 global.window={location:{hash:'#t=TOKEN-A',search:'',pathname:'/pedido/A'},history:{state:{},replaceState(){window.location.hash='';}},confirm:()=>true};
 global.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const api={get:(url)=>{const d=deferred();requests.push({url,...d});return d.promise;},patch:(url)=>{const d=deferred();patches.push({url,...d});return d.promise;}};
 const fallback=new Proxy({}, {get:(_,key)=>key==='useLojaStore' ? fn=>fn({status:null}) : key==='useToastStore' ? fn=>fn({show:()=>{}}) : key==='STATUS_FINAIS'?[]:()=>null});
 const mocks={'@/lib/format':new Proxy({contatoDoPedido:()=>({nome:'Cliente',telefone:''})},{get:(obj,key)=>obj[key]??(()=> '')}),react,'react/jsx-runtime':{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},'next/navigation':{useParams:()=>({id:'A'})},'@/lib/api':{api,extractApiError:()=> 'failure'},'@/lib/convidado':{tokenDoPedido:()=>null},'@/lib/socket':{conectarPedidos:()=>{const socket={handlers:{},connected:false,on(event,fn){this.handlers[event]=fn;},emit(){},connect(){},removeAllListeners(){this.handlers={};},disconnect(){}};sockets.push(socket);return socket;}}};
 const filename=path.resolve(__dirname,panel?'../components/pedidos/PedidoDetalheModal.tsx':'../app/pedido/[id]/page.tsx');
 const mod=new Module(filename,module);mod.require=name=>mocks[name]??(name.startsWith('@/')||['sonner','lucide-react','next/link'].includes(name)?fallback:require(name));
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
 const props=id=>({open:true,pedidoId:id,onClose:()=>{closes++;},onUpdated:data=>updates.push(data)});
 const wrapper=panel?mod.exports.PedidoDetalheModal(props('A')):mod.exports.default();
 const A=harness(wrapper.type,panel?props('A'):wrapper.props);
 if(!panel){assert.equal(requests.length,0,'no GET before token resolution');assert.equal(sockets.length,0,'no socket before token resolution');A.replayEffects();A.settle();assert.equal(saved.get('lanchonete:pedidoToken:A'),'TOKEN-A');assert.equal(requests[0].url,'/pedidos/convidado/A');}
 A.unmount();
 window.location.hash='#t=TOKEN-B';window.location.pathname='/pedido/B';
 const B=harness(wrapper.type,panel?props('B'):{pedidoId:'B'});B.settle();
 const pedido=id=>({id,numero:1,status:'NOVO',tipoEntrega:'RETIRADA',itens:[],pagamento:'CARTAO',criadoEm:'2026-10-15',subtotal:1,total:1});
 requests.at(-1).resolve({data:pedido('B')});await new Promise(r=>setImmediate(r));B.settle();
 requests[0].resolve({data:pedido('A')});await new Promise(r=>setImmediate(r));
 assert.equal(A.staleWrites,0,'A cannot update after selecting B');
 if(panel){const action=find(B.tree,node=>node.props?.onClick?.name==='handleAvancar');assert.ok(action);const changing=action.props.onClick();assert.equal(patches[0].url,'/admin/pedidos/B/status');B.unmount();patches[0].resolve({data:pedido('B')});await changing;assert.equal(closes,0,'late action cannot close a later selection');assert.equal(updates.length,0);}
 else {B.unmount();window.location.hash='';const reload=harness(wrapper.type,{pedidoId:'B'});reload.settle();assert.equal(requests.at(-1).url,'/pedidos/convidado/B','reload uses persisted link token');reload.unmount();}
 assert.equal(B.staleWrites,0);
 delete global.window;delete global.localStorage;
 console.log(panel?'modal race regressions passed':'guest resolution/race/reload regressions passed');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
