// Recover a tracked classification/confirmation interruption; never repeat earlier writes.
import fs from 'node:fs';
import {execute,reconcile,state,snapshot,safeError,ROOT} from './scripts/runtime.mjs';
try{
 if(state.pending!==null&&state.pending!==undefined)await reconcile();
 let result=await snapshot(),p=result.items.find(p=>p.id==='1'),b=p?.ballots[state.wallet]?.at(-1);
 if(!b||b.option_id!==2)throw Error('Expected classified option2 not found. Inspect state; no transaction sent.');
 if(b.status==='classified'){
  if(p.tally.some(n=>n!==0))throw Error('Pre-confirmation tally was not zero.');
  if(state.transactions.some(t=>t.action==='confirm'))throw Error('Confirmation ledger already exists; review original transaction, do not resend.');
  fs.writeFileSync(ROOT+'/before-confirmation.json',JSON.stringify(result,null,2));
  await execute('confirm',['1']);result=await snapshot();p=result.items.find(p=>p.id==='1');b=p.ballots[state.wallet].at(-1);
 }
 if(b.status!=='confirmed'||p.tally[0]!==0||p.tally[1]!==1||p.wallet_count!==1)throw Error('Expected final one-wallet confirmation was not observed.');
 fs.writeFileSync(ROOT+'/demo-result.json',JSON.stringify(result,null,2));
 fs.writeFileSync(ROOT+'/deployment.json',JSON.stringify({network:'Bradbury Phase 2',chainId:4221,contract:state.contract,wallet:state.wallet,transactions:result.transactions.map(x=>({action:x.action,txId:x.txId,status:x.status,consensusResult:x.consensusResult,outcome:x.outcome,executionResult:x.executionResult,netCostGEN:x.netCostGEN})),netCostGEN:result.netCostGEN},null,2));
 console.log(JSON.stringify(result,null,2));
}catch(e){console.error(safeError(e));process.exitCode=1;}
