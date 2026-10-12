import test from 'node:test';
import assert from 'node:assert/strict';
import { burstVectors, createMatchBurst } from '../dist/game/burst-effects.js';

test('explosion spreads evenly around the tile and stays finite at mobile sizes', () => {
  for (const size of [20,31.7,46]) {
    const vectors = burstVectors(size);
    assert.equal(vectors.length,12);
    assert.ok(Math.abs(vectors.reduce((sum,p)=>sum+p.x,0)) < 1e-8);
    assert.ok(Math.abs(vectors.reduce((sum,p)=>sum+p.y,0)) < 1e-8);
    for (const p of vectors) {
      const radius = Math.hypot(p.x,p.y);
      assert.ok(radius > size*.6 && radius <= size);
    }
  }
});

test('reduced motion does not create particle DOM', () => {
  const cell = {querySelector: () => ({})};
  assert.doesNotThrow(() => createMatchBurst(cell,0));
});

test('burst preserves the original tile and builds four fragments plus twelve sparks', () => {
  const makeNode = () => ({ children: [], style: {setProperty(){}}, setAttribute(){}, removeAttribute(){}, appendChild(node){this.children.push(node);} });
  const originalDocument = globalThis.document;
  globalThis.document = {createElement: makeNode};
  try {
    let clones = 0;
    const surface = {cloneNode: () => {clones++;return makeNode();}};
    const cell = makeNode();
    cell.querySelector = () => surface;
    cell.getBoundingClientRect = () => ({width:31.7});
    createMatchBurst(cell,520);
    assert.equal(clones,4);
    assert.equal(cell.children.length,1);
    assert.equal(cell.children[0].children.length,16);
    assert.equal(cell.children[0].className,'match-burst');
    assert.equal(cell.querySelector(),surface);
  } finally { globalThis.document = originalDocument; }
});

function feedbackFixture() {
  const nodes = () => ({
    children: [], style: {setProperty(){}}, classList: { values:new Set(), add(...names){names.forEach(n=>this.values.add(n));} },
    setAttribute(){}, removeAttribute(){}, appendChild(node){this.children.push(node);},
  });
  const surfaces = [0,1].map(() => ({
    listeners: new Set(), cloneNode: nodes,
    addEventListener(type,cb){this.listeners.add(cb);},
    removeEventListener(type,cb){this.listeners.delete(cb);},
    end(){for(const cb of [...this.listeners])cb({target:this,animationName:'tile-explode'});},
  }));
  const cells = surfaces.map(surface => ({...nodes(),querySelector:()=>surface,
    getBoundingClientRect(){throw new Error('matching frame must not force a layout read');},
  }));
  return {nodes,surfaces,cells};
}

test('match feedback begins synchronously and ends on the final CSS animation event', async () => {
  const {playMatchFeedback} = await import('../dist/game/burst-effects.js');
  const fixture = feedbackFixture();
  const oldDocument = globalThis.document;
  globalThis.document = {createElement:fixture.nodes};
  try {
    let finished = 0;
    const scheduled = [];
    playMatchFeedback({cells:fixture.cells,duration:440,size:35,
      schedule:(cb,delay)=>scheduled.push({cb,delay}),onFinish:()=>finished++});
    for(const cell of fixture.cells){
      assert.ok(cell.classList.values.has('pop'));
      assert.equal(cell.children.length,1);
    }
    assert.equal(scheduled.length,1);
    assert.ok(scheduled[0].delay > 440, 'only a completion fallback is scheduled');
    fixture.surfaces[0].end();
    assert.equal(finished,0);
    fixture.surfaces[1].end();
    assert.equal(finished,1);
    scheduled[0].cb();
    assert.equal(finished,1);
    assert.equal(fixture.surfaces[0].listeners.size,0);
  } finally {globalThis.document=oldDocument;}
});

test('restarting cancels animation listeners and prevents stale completion', async () => {
  const {playMatchFeedback} = await import('../dist/game/burst-effects.js');
  const fixture = feedbackFixture();
  const oldDocument = globalThis.document;
  globalThis.document = {createElement:fixture.nodes};
  try {
    let finished = 0;
    let fallback;
    const cancel = playMatchFeedback({cells:fixture.cells,duration:440,size:35,
      schedule:cb=>{fallback=cb;},onFinish:()=>finished++});
    cancel();
    fixture.surfaces.forEach(surface=>surface.end());
    fallback();
    assert.equal(finished,0);
    fixture.surfaces.forEach(surface=>assert.equal(surface.listeners.size,0));
  } finally {globalThis.document=oldDocument;}
});

test('reduced motion completes immediately without an animation delay', async () => {
  const {playMatchFeedback} = await import('../dist/game/burst-effects.js');
  let finished = 0;
  playMatchFeedback({cells:[],duration:0,size:35,
    schedule:()=>{throw new Error('must not wait');},onFinish:()=>finished++});
  assert.equal(finished,1);
});
