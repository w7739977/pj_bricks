import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createBoard,findSolvablePairDeep,reshuffleInPlace,countOpeningPairs} from '../../dist/game/board.js';
import {getLevelConfig,createSeededRng} from '../../dist/game/levels.js';

// Independent ray and coordinate translation oracle. No production movement helpers.
export function legalMoves(b,{first=false,straightOnly=false}={}) {
 const out=[],seen=new Set();
 function targets(a,r,c){const v=a[r][c],t=[];for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])for(let y=r+dr,x=c+dc;y>=0&&y<14&&x>=0&&x<10;y+=dr,x+=dc){if(a[y][x]===null)continue;if(a[y][x]===v)t.push([y,x]);break;}return t;}
 function add(a,r,c,gesture){for(const [tr,tc] of targets(a,r,c)){const n=a.map(row=>row.slice());n[r][c]=null;n[tr][tc]=null;const key=JSON.stringify(n);if(!seen.has(key)){seen.add(key);out.push({board:n,r,c,tr,tc,gesture});if(first)return true;}}return false;}
 for(let r=0;r<14;r++)for(let c=0;c<10;c++)if(b[r][c]!==null)if(add(b,r,c,null)&&first)return out;
 for(let r=0;r<14;r++)for(let c=0;c<10;c++)if(b[r][c]!==null)for(const [axis,dr,dc] of [['row',0,1],['col',1,0]])for(const dir of [-1,1]){
  const cells=[[r,c]];for(let y=r+dr*dir,x=c+dc*dir;y>=0&&y<14&&x>=0&&x<10&&b[y][x]!==null;y+=dr*dir,x+=dc*dir)cells.push([y,x]);
  const members=new Set(cells.map(([y,x])=>y*10+x));
  for(const sign of [-1,1]){if(straightOnly&&sign!==dir)continue;for(let step=1;step<14;step++){
   const delta=sign*step,positions=cells.map(([y,x])=>[y+dr*delta,x+dc*delta]);
   if(positions.some(([y,x])=>y<0||y>=14||x<0||x>=10||(!members.has(y*10+x)&&b[y][x]!==null)))break;
   const a=b.map(row=>row.slice());cells.forEach(([y,x])=>a[y][x]=null);positions.forEach(([y,x],i)=>a[y][x]=b[cells[i][0]][cells[i][1]]);
   if(add(a,r+dr*delta,c+dc*delta,{r,c,axis,dir,delta,length:cells.length})&&first)return out;
  }}
 }
 return out;
}

if(typeof process !== 'undefined' && process.argv[1]?.endsWith('/playability-audit.mjs')){
 const rows=[],mismatches=[],deadlocks=[];let states=0;const start=performance.now();
 for(const level of [1,2,3,4,5,6,7,10,15]){
  const stats={level,runs:Number(process.env.AUDIT_RUNS || 200),wins:0,failures:0,deadlocks:0,dragMoves:0,directMoves:0,reshuffles:0,openings:[],deadlockRemaining:[],maxSearchMs:0};
  for(let run=0;run<stats.runs;run++){
   const cfg=getLevelConfig(level,{randomSeed:(0xabcdef+run*7919+level*31337)>>>0}),rng=createSeededRng((level*1009+run*9176)>>>0);
   let b=createBoard({iconIndices:[...cfg.iconIndices],openingPairs:cfg.openingPairs,rng:createSeededRng(cfg.seed)}).board,left=cfg.reshuffles;
   stats.openings.push(countOpeningPairs(b));
   for(let turn=0;turn<75;turn++){
    if(b.flat().every(v=>v===null)){stats.wins++;break;}
    const t=performance.now(),moves=legalMoves(b),ms=performance.now()-t;stats.maxSearchMs=Math.max(stats.maxSearchMs,ms);states++;
    const expected=moves.length>0,actual=!!findSolvablePairDeep(b).pair;
    if(expected!==actual)mismatches.push({level,run,turn,b,expected,actual});
    if(!expected){stats.deadlocks++;stats.deadlockRemaining.push(b.flat().filter(v=>v!==null).length);if(deadlocks.length<12)deadlocks.push({level,run,turn,b});if(left){left--;stats.reshuffles++;if(!reshuffleInPlace(b,rng).ok){stats.failures++;break;}continue;}stats.failures++;break;}
    // Random direct-first strategy: no lookahead, no clairvoyant solution search.
    const direct=moves.filter(m=>!m.gesture),pool=direct.length?direct:moves;
    const m=pool[Math.floor(rng()*pool.length)];stats[m.gesture?'dragMoves':'directMoves']++;b=m.board;
   }
  }
  rows.push(stats);console.log(JSON.stringify({...stats,openings:[Math.min(...stats.openings),Math.max(...stats.openings)],deadlockRemaining:undefined}));
 }
 const result={method:'independent legal gesture oracle; direct-first random choice; no lookahead',states,elapsedMs:performance.now()-start,rows,mismatches,deadlocks};
 fs.mkdirSync('test-artifacts/playability',{recursive:true});
 fs.writeFileSync(process.argv[2] || 'test-artifacts/playability/audit.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({states,mismatches:mismatches.length,elapsedMs:result.elapsedMs}));
}
