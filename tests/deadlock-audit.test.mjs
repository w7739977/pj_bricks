import test from 'node:test';
import assert from 'node:assert/strict';
import { ROWS, COLS, hasAnySolvablePairDeep, findSolvablePairDeep, reshuffleInPlace } from '../dist/game/board.js';
import { createSeededRng } from '../dist/game/levels.js';
import { getDragOffsetBounds } from '../dist/game/drag-input.js';

// Independent oracle: translate coordinates and scan rays, without production
// chain, movement, path or target helpers. This catches shared-helper mistakes.
const blank = () => Array.from({length:ROWS},()=>Array(COLS).fill(null));
function match(b,r,c) {
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for(let rr=r+dr,cc=c+dc;rr>=0&&rr<ROWS&&cc>=0&&cc<COLS;rr+=dr,cc+=dc) {
      if(b[rr][cc]===null) continue;
      if(b[rr][cc]===b[r][c]) return true;
      break;
    }
  }
  return false;
}
function oracle(b) {
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if(b[r][c]===null) continue;
    if(match(b,r,c)) return true;
    for(const [dr,dc] of [[1,0],[0,1]]) for(const initial of [-1,1]) {
      const cells=[[r,c]];
      for(let rr=r+dr*initial,cc=c+dc*initial;rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&b[rr][cc]!==null;rr+=dr*initial,cc+=dc*initial) cells.push([rr,cc]);
      const members=new Set(cells.map(([rr,cc])=>rr*COLS+cc));
      for(const direction of [-1,1]) for(let step=1;step<Math.max(ROWS,COLS);step++) {
        const d=direction*step;
        const positions=cells.map(([rr,cc])=>[rr+dr*d,cc+dc*d]);
        if(positions.some(([rr,cc])=>rr<0||rr>=ROWS||cc<0||cc>=COLS||(!members.has(rr*COLS+cc)&&b[rr][cc]!==null))) break;
        const next=b.map(row=>row.slice());
        cells.forEach(([rr,cc])=>next[rr][cc]=null);
        positions.forEach(([rr,cc],i)=>next[rr][cc]=b[cells[i][0]][cells[i][1]]);
        if(match(next,r+dr*d,c+dc*d)) return true;
      }
    }
  }
  return false;
}

test('deadlock search agrees with independent legal-gesture oracle across sparse and crowded boards', () => {
  const rng=createSeededRng(231353);
  for(const count of [4,16,40,70,100,140]) for(let sample=0;sample<60;sample++) {
    const b=blank(), positions=Array.from({length:ROWS*COLS},(_,i)=>i);
    for(let i=positions.length-1;i>0;i--) {const j=Math.floor(rng()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
    // Mix paired and unique values to exercise true deadlocks as well as matches.
    for(let i=0;i<count;i++) {const p=positions[i];b[Math.floor(p/COLS)][p%COLS]=sample%2 ? Math.floor(i/2) : (i<4 ? Math.floor(i/2) : i);}
    const before=b.map(row=>row.slice()), expected=oracle(b);
    assert.equal(hasAnySolvablePairDeep(b),expected,`count=${count}, sample=${sample}`);
    const result=findSolvablePairDeep(b);
    if(result.pair&&!result.direct) {
      const {r,c,chain,delta}=result.shiftFrom;
      const positions=Array.from({length:chain.length},(_,i)=>({r:r+(chain.axis==='col'?chain.dir*i:0),c:c+(chain.axis==='row'?chain.dir*i:0)}));
      const bounds=getDragOffsetBounds({positions,axis:chain.axis,pitch:1,rows:ROWS,cols:COLS,board:b});
      assert.ok(delta>=bounds.min&&delta<=bounds.max,'solver move must also satisfy actual pointer bounds');
    }
    assert.deepEqual(b,before);
  }
});

test('reshuffle accepts a playable diagonal pair even when no occupied cells share a line', () => {
  const b=blank();b[0][0]=7;b[13][9]=7;
  assert.equal(hasAnySolvablePairDeep(b),true);
  assert.deepEqual(reshuffleInPlace(b,()=>0,{maxAttempts:1}),{ok:true});
});

test('a crowded full board can be a real deadlock despite having matching icon counts', () => {
  const b=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r*COLS+c));
  b[0][0]=500;b[13][9]=500;
  b[0][9]=501;b[13][0]=501;
  assert.equal(oracle(b),false);
  assert.equal(hasAnySolvablePairDeep(b),false);
  b[0][1]=500;
  assert.equal(hasAnySolvablePairDeep(b),true);
});
