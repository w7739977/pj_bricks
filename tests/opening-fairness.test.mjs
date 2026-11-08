import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,countOpeningPairs,findTargets,hasAnySolvablePairDeep} from '../dist/game/board.js';
import {createSeededRng,getLevelConfig} from '../dist/game/levels.js';
import {legalMoves} from '../tools/performance-lab/playability-audit.mjs';

// Online difficulty audit: these seeds previously had one forced opening pair
// followed immediately by a true deadlock with 138 tiles still on the board.
for (const [level,seed] of [[10,12237941],[15,12497573],[15,12616358],[15,12893523]]) {
  test(`level ${level}, seed ${seed}: opening has a legal continuation without reshuffling`, () => {
    const config=getLevelConfig(level,{randomSeed:seed});
    const options={iconIndices:config.iconIndices,openingPairs:config.openingPairs};
    const result=createBoard({...options,rng:createSeededRng(seed)});
    assert.equal(result.ok,true);
    assert.deepEqual(result,createBoard({...options,rng:createSeededRng(seed)}),'retry stays deterministic');
    const count=countOpeningPairs(result.board);
    assert.ok(count>=config.openingPairs.min && count<=config.openingPairs.max,'difficulty budget is preserved');
    let continuing=false;
    for(let r=0;r<14;r++)for(let c=0;c<10;c++)for(const t of findTargets(result.board,r,c)){
      const next=result.board.map(row=>row.slice());
      next[r][c]=null;next[t.r][t.c]=null;
      continuing ||= hasAnySolvablePairDeep(next);
    }
    assert.equal(continuing,true,'at least one first match must leave another legal move');
    assert.ok(legalMoves(result.board).some(move=>legalMoves(move.board,{first:true}).length),
      'independent gesture oracle also confirms the continuation');
  });
}
