import fs from 'node:fs/promises';
import {build} from 'esbuild';
const js=await build({entryPoints:['intentpoll.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true});
const assets={'/intentpoll.js':{type:'text/javascript',body:js.outputFiles[0].text},'/intentpoll.css':{type:'text/css',body:await fs.readFile('intentpoll.css','utf8')}};
const html=await fs.readFile('intentpoll.html','utf8');
await fs.mkdir('dist/server',{recursive:true});
await fs.writeFile('dist/server/index.js',`const assets=${JSON.stringify(assets)},html=${JSON.stringify(html)};
export default {async fetch(request){const u=new URL(request.url);if(u.pathname==='/rpc'){
 if(request.method!=='POST')return new Response('POST required',{status:405});
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==u.origin)return new Response('Origin rejected',{status:403});
 const raw=await request.text();if(raw.length>70000)return new Response('Too large',{status:413});let b;try{b=JSON.parse(raw);}catch{return new Response('Invalid JSON',{status:400});}
 if(!b||Array.isArray(b)||typeof b.method!=='string'||!Array.isArray(b.params||[]))return new Response('Invalid RPC',{status:400});
 const m=b.method,allowed=['eth_call','eth_estimateGas','eth_chainId','eth_gasPrice','eth_maxPriorityFeePerGas','eth_feeHistory'].includes(m)||/^eth_get[A-Za-z]+$/.test(m)||/^gen_(get|call|estimate)[A-Za-z_]*$/.test(m);
 if(!allowed)return Response.json({jsonrpc:'2.0',id:b.id,error:{code:-32601,message:'Public read/estimation relay only; no signing or broadcasting.'}},{status:403});
 try{const r=await fetch(m.startsWith('eth_')?'https://rpc.testnet-chain.genlayer.com':'https://rpc-bradbury.genlayer.com',{method:'POST',headers:{'Content-Type':'application/json'},body:raw,signal:AbortSignal.timeout(30000)});return new Response(r.body,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}catch{return Response.json({error:{code:-32000,message:'Public RPC temporarily unavailable'}},{status:502});}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"};
 const a=assets[u.pathname];if(a)return new Response(request.method==='HEAD'?null:a.body,{headers:{...headers,'Content-Type':a.type}});
 if(!['/','/intentpoll','/intentpoll/'].includes(u.pathname))return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:html,{headers:{...headers,'Content-Type':'text/html','Cache-Control':'no-store'}});
}};`);
console.log('Built standalone IntentPoll Worker.');

