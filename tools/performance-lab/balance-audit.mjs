import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createBoard,reshuffleInPlace,countOpeningPairs} from '../../dist/game/board.js';
import {createSeededRng,getLevelConfig} from '../../dist/game/levels.js';
import {legalMoves} from './playability-audit.mjs';

// A visible-board, direct-first random policy with no lookahead. It is a
// calibration proxy, not an estimate of human ability or rewarded-ad conversion.
const runs=Number(process.env.BALANCE_RUNS || 200);
const maxLevel=Number(process.env.BALANCE_LEVELS || 25);
const seedOffset=Number(process.env.BALANCE_SEED || 0) >>> 0;
if(!Number.isInteger(runs)||runs<1||!Number.isInteger(maxLevel)||maxLevel<1)throw Error('runs and levels must be positive integers');
const rows=[],started=performance.now();
for(let level=1;level<=maxLevel;level++){
 const required=[],openings=[],dragShares=[];
 for(let run=0;run<runs;run++){
  const config=getLevelConfig(level,{randomSeed:((0x324129+run*7919+level*31337)^seedOffset)>>>0});
  const rng=createSeededRng(((level*104729+run*9176)^seedOffset)>>>0);
  const generated=createBoard({iconIndices:config.iconIndices,openingPairs:config.openingPairs,rng:createSeededRng(config.seed)});
  if(!generated.ok)throw Error(`generation failed: ${level}/${run}`);
  let b=generated.board,rescues=0,drags=0,matches=0;
  const maxRescues=config.reshuffles+3;
  openings.push(countOpeningPairs(b));
  for(let turn=0;turn<80;turn++){
   if(b.flat().every(v=>v===null)){required.push(rescues);dragShares.push(drags/matches);break;}
   const moves=legalMoves(b),direct=moves.filter(m=>!m.gesture);
   if(!moves.length){
    if(rescues===maxRescues || !reshuffleInPlace(b,rng).ok){required.push(null);break;}
    rescues++;continue;
   }
   const choices=direct.length?direct:moves,m=choices[Math.floor(rng()*choices.length)];
   if(m.gesture)drags++;matches++;b=m.board;
  }
 }
 if(required.length!==runs)throw Error('unfinished simulation');
 const config=getLevelConfig(level,{randomSeed:1});
 rows.push({level,runs,freeReshuffles:config.reshuffles,hints:config.hints,openingRange:config.openingPairs,actualOpeningRange:[Math.min(...openings),Math.max(...openings)],requiredReshuffles:required,winRates:[0,1,2,3].map(extra=>required.filter(n=>n!==null && n<=config.reshuffles+extra).length/runs),meanDragShare:dragShares.reduce((a,b)=>a+b,0)/dragShares.length});
 console.log(JSON.stringify({...rows.at(-1),requiredReshuffles:undefined}));
}
const curves=[0,1,2,3].map(extra=>{
 let survival=1,expectedStop=0;const reach=[{level:1,probability:1}];
 for(const row of rows){const next=survival*row.winRates[extra];expectedStop+=row.level*(survival-next);survival=next;reach.push({level:row.level+1,probability:survival});}
 return {extraReshufflesPerLevel:extra,expectedStopCapped:expectedStop+(maxLevel+1)*survival,censoredBeyond:maxLevel,reach};
});
const report={method:'direct-first random legal policy, no lookahead; fixed boards in levels 1–5, different seeds thereafter; independent per-level samples composed into survival curves',runsPerLevel:runs,maxLevel,seedOffset,elapsedMs:performance.now()-started,rows,curves};
fs.mkdirSync('test-artifacts/playability',{recursive:true});
fs.writeFileSync(process.argv[2] || 'test-artifacts/playability/balance.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(curves.map(c=>({extra:c.extraReshufflesPerLevel,expectedStopCapped:c.expectedStopCapped,reach10:c.reach.find(r=>r.level===10)?.probability,reach15:c.reach.find(r=>r.level===15)?.probability,reach20:c.reach.find(r=>r.level===20)?.probability}))));
