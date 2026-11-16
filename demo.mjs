import fs from 'node:fs';
import {execute,state,snapshot,safeError,ROOT} from './scripts/runtime.mjs';
try{
 if(!state.contract)throw Error('Deploy first.');
 if(state.transactions.some(t=>t.action==='create_poll'))throw Error('Demo already started. Reconcile original transactions; do not rerun.');
 await execute('create_poll',['Synthetic documentation pilot','Which documentation format should this synthetic test poll pilot?',JSON.stringify(['Static API reference','Interactive walkthrough'])]);
 await execute('cast_ballot',['1','I prefer the interactive walkthrough rather than the static API reference.']);
 await execute('classify',['1']);
 const suggested=await snapshot();
 const p=suggested.items.find(p=>p.id==='1'),ballot=p?.ballots[state.wallet]?.at(-1);
 if(ballot?.option_id!==2||p.tally.some(n=>n!==0))throw Error('Expected option2 classification with zero tally before confirmation was not observed.');
 fs.writeFileSync(ROOT+'/before-confirmation.json',JSON.stringify(suggested,null,2));
 await execute('confirm',['1']);
 const result=await snapshot(),final=result.items.find(p=>p.id==='1');
 if(final?.tally[0]!==0||final?.tally[1]!==1||final?.wallet_count!==1)throw Error('Expected one confirmed builder-wallet vote was not observed.');
 fs.writeFileSync(ROOT+'/demo-result.json',JSON.stringify(result,null,2));
 fs.writeFileSync(ROOT+'/deployment.json',JSON.stringify({network:'Bradbury Phase 2',chainId:4221,contract:state.contract,wallet:state.wallet,transactions:result.transactions.map(x=>({action:x.action,txId:x.txId,status:x.status,consensusResult:x.consensusResult,outcome:x.outcome,executionResult:x.executionResult,netCostGEN:x.netCostGEN})),netCostGEN:result.netCostGEN},null,2));
 console.log(JSON.stringify(result,null,2));
}catch(e){console.error(safeError(e));process.exitCode=1;}
