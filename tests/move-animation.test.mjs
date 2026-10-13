import test from 'node:test';
import assert from 'node:assert/strict';

import { createMoveAnimator } from '../dist/game/move-animation.js';

function createScheduler() {
  let nextId = 1;
  const frames = new Map();
  const timers = new Map();
  const cancelledFrames = new Set();
  const cancelledTimers = new Set();

  return {
    requestFrame(callback) {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      cancelledFrames.add(id);
    },
    setTimer(callback) {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearTimer(id) {
      cancelledTimers.add(id);
    },
    runFrame(id) {
      frames.get(id)?.();
    },
    runTimer(id) {
      timers.get(id)?.();
    },
    frameIds() {
      return [...frames.keys()];
    },
    timerIds() {
      return [...timers.keys()];
    },
    cancelledFrames,
    cancelledTimers,
  };
}

function createCell(onLayout = () => {}) {
  return {
    style: { transition: '', transform: '', willChange: '', zIndex: '' },
    get offsetWidth() {
      onLayout();
      return 40;
    },
  };
}

test('follow transfers a continuous visual offset to the chain current cells', () => {
  const scheduler = createScheduler();
  const cells = [createCell(), createCell()];
  const animator = createMoveAnimator({
    getCell: (_r, c) => cells[c],
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  assert.equal(cells[0].style.transform, 'translate3d(12px, 0px, 0)');
  assert.equal(cells[0].style.transition, 'none');

  animator.follow([{ r: 0, c: 1 }], -28, 0);
  assert.deepEqual(cells[0].style, { transition: '', transform: '', willChange: '', zIndex: '' });
  assert.equal(cells[1].style.transform, 'translate3d(-28px, 0px, 0)');
});

test('settleFollow magnetically returns followed cells to the grid', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120);
  scheduler.runFrame(scheduler.frameIds()[0]);

  assert.equal(cell.style.transition, 'transform 120ms cubic-bezier(0.22, 0.61, 0.36, 1)');
  assert.equal(cell.style.transform, '');

  scheduler.runTimer(scheduler.timerIds()[0]);
  assert.deepEqual(cell.style, { transition: '', transform: '', willChange: '', zIndex: '' });
});

test('settleFollow commits the pointer offset before scheduling its transition', () => {
  const scheduler = createScheduler();
  let layoutReads = 0;
  const cell = createCell(() => { layoutReads++; });
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120);

  assert.equal(layoutReads, 1);
});

test('settleFollow reports completion after its cleanup timer', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  let completions = 0;
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120, () => { completions++; });
  assert.equal(completions, 0);
  scheduler.runFrame(scheduler.frameIds()[0]);
  assert.equal(completions, 0);
  scheduler.runTimer(scheduler.timerIds()[0]);
  assert.equal(completions, 1);
});

test('rollback animation includes the pointer residual offset', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 2, toR: 0, toC: 0 },
  ], 200, { offsetX: 6, offsetY: 0 });

  assert.equal(cell.style.transform, 'translate3d(86px, 0px, 0)');
});

test('rollback animation releases direct pointer-follow ownership', () => {
  const scheduler = createScheduler();
  const cells = [createCell(), createCell()];
  const animator = createMoveAnimator({
    getCell: (_r, c) => cells[c],
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 200, { offsetX: 12 });

  assert.deepEqual(cells[0].style, { transition: '', transform: '', willChange: '', zIndex: '' });
  assert.equal(cells[1].style.transform, 'translate3d(-28px, 0px, 0)');
});

test('an empty rollback settles the followed cells in place', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.animate([], 200, { offsetX: 12 });
  scheduler.runFrame(scheduler.frameIds()[0]);

  assert.equal(cell.style.transition, 'transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1)');
  assert.equal(cell.style.transform, '');
});

test('a newer animation blocks retained settle callbacks', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.settleFollow(120);
  const [settleFrame] = scheduler.frameIds();
  scheduler.runFrame(settleFrame);
  const [settleTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 2 },
  ], 200);
  scheduler.runTimer(settleTimer);

  assert.equal(cell.style.transform, 'translate3d(-80px, 0px, 0)');
  assert.equal(cell.style.transition, 'none');
});

test('zero-duration settling clears follow styles synchronously', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  let completions = 0;
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.settleFollow(0, () => { completions++; });

  assert.deepEqual(cell.style, { transition: '', transform: '', willChange: '', zIndex: '' });
  assert.deepEqual(scheduler.frameIds(), []);
  assert.deepEqual(scheduler.timerIds(), []);
  assert.equal(completions, 1);
});

test('zero-duration movement leaves no animation callbacks or styles', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 0);

  assert.deepEqual(cell.style, { transition: '', transform: '', willChange: '', zIndex: '' });
  assert.deepEqual(scheduler.frameIds(), []);
  assert.deepEqual(scheduler.timerIds(), []);
});

test('cleanup timing starts only after the transition frame begins', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);

  assert.deepEqual(scheduler.timerIds(), []);
  scheduler.runFrame(scheduler.frameIds()[0]);
  assert.equal(scheduler.timerIds().length, 1);
});

test('stale callbacks cannot overwrite a newer animation on the same cell', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const [oldFrame] = scheduler.frameIds();
  const [oldTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 2 },
  ], 90);

  assert.equal(cell.style.transform, 'translate3d(-80px, 0px, 0)');
  assert.equal(cell.style.transition, 'none');

  scheduler.runFrame(oldFrame);
  scheduler.runTimer(oldTimer);

  assert.equal(cell.style.transform, 'translate3d(-80px, 0px, 0)');
  assert.equal(cell.style.transition, 'none');
});

test('a newer animation cancels pending work for the same cell', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const [oldFrame] = scheduler.frameIds();
  scheduler.runFrame(oldFrame);
  const [oldTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 1, toR: 0, toC: 2 },
  ], 90);

  assert.equal(scheduler.cancelledFrames.has(oldFrame), true);
  assert.equal(scheduler.cancelledTimers.has(oldTimer), true);

  scheduler.runTimer(oldTimer);
  assert.equal(cell.style.transform, 'translate3d(-40px, 0px, 0)');
  assert.equal(cell.style.transition, 'none');
});

test('cancelAll clears cells that are following the pointer', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 15, 0);
  animator.cancelAll();

  assert.deepEqual(cell.style, { transition: '', transform: '', willChange: '', zIndex: '' });
});

test('cancelAll clears active cells and blocks retained callbacks', () => {
  const scheduler = createScheduler();
  const cells = [createCell(), createCell()];
  const animator = createMoveAnimator({
    getCell: (_r, c) => cells[c],
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 0 },
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const frameIds = scheduler.frameIds();
  const timerIds = scheduler.timerIds();

  animator.cancelAll();

  assert.deepEqual(cells.map(cell => cell.style), [
    { transition: '', transform: '', willChange: '', zIndex: '' },
    { transition: '', transform: '', willChange: '', zIndex: '' },
  ]);
  assert.equal(frameIds.every(id => scheduler.cancelledFrames.has(id)), true);
  assert.equal(timerIds.every(id => scheduler.cancelledTimers.has(id)), true);

  frameIds.forEach(id => scheduler.runFrame(id));
  timerIds.forEach(id => scheduler.runTimer(id));
  assert.deepEqual(cells.map(cell => cell.style), [
    { transition: '', transform: '', willChange: '', zIndex: '' },
    { transition: '', transform: '', willChange: '', zIndex: '' },
  ]);
});


test('follow initializes a replacement SVG inside an existing followed cell', () => {
  const scheduler = createScheduler();
  let piece = createCell();
  const cell = createCell();
  cell.querySelector = () => piece;
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });
  animator.follow([{ r: 0, c: 0 }], 35, 0);
  piece = createCell();
  animator.follow([{ r: 0, c: 0 }], -5, 0);
  assert.equal(piece.style.transition, 'none');
  assert.equal(piece.style.willChange, 'transform');
  assert.equal(piece.style.zIndex, '10');
  assert.equal(piece.style.transform, 'translate3d(-5px, 0px, 0)');
});


test('drag moves the full tile surface and preserves the SVG local size', () => {
  const scheduler = createScheduler();
  const surface = createCell();
  const svg = createCell();
  const cell = createCell();
  cell.querySelector = selector => selector === '.tile-piece' ? surface : svg;
  const animator = createMoveAnimator({
    getCell: () => cell, getPitch: () => 35.5,
    requestFrame: scheduler.requestFrame, cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer, clearTimer: scheduler.clearTimer,
  });
  animator.follow([{r: 0, c: 0}], 25, 0);
  assert.equal(surface.style.transform, 'translate3d(25px, 0px, 0)');
  assert.equal(svg.style.transform, '');
  animator.settleFollow(90);
  scheduler.runFrame(scheduler.frameIds().at(-1));
  scheduler.runTimer(scheduler.timerIds().at(-1));
  assert.equal(surface.style.transform, '');
  assert.equal(surface.style.willChange, '');
  assert.equal(svg.style.transform, '');
});

function layerFixture(count=4) {
  let reads=0,queries=0;
  function node(rect=null) {
    const values=new Set();
    const n={style:{transition:'',transform:'',willChange:'',zIndex:''},children:[],
      classList:{add(...v){v.forEach(x=>values.add(x));},remove(...v){v.forEach(x=>values.delete(x));},contains(v){return values.has(v);}},
      setAttribute(){},removeAttribute(){},querySelector(){return null;},
      appendChild(child){this.children.push(child);child.parent=this;},
      remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);},
      getBoundingClientRect(){reads++;return rect;},
      get offsetWidth(){reads++;return 160;},
      cloneNode(){return node(rect);},
    };
    return n;
  }
  const board=node({left:100,top:50,right:500,bottom:600});board.clientLeft=board.clientTop=4;
  const pieces=[],cells=[];
  for(let c=0;c<count;c++) {
    const piece=node();pieces.push(piece);
    const left=107+c*37.1;
    const cell=node({left,top:57,right:left+37.1,bottom:94.1});
    cell.querySelector=()=>{queries++;return piece;};cells.push(cell);
  }
  const scheduler=createScheduler();
  let lookups=0;
  const animator=createMoveAnimator({getCell:(_r,c)=>{lookups++;return cells[c];},getPitch:()=>37.1,
    getBoard:()=>board,createElement:()=>node(),requestFrame:scheduler.requestFrame,
    cancelFrame:scheduler.cancelFrame,setTimer:scheduler.setTimer,clearTimer:scheduler.clearTimer});
  const positions=cells.map((_el,c)=>({r:0,c}));
  return {board,pieces,cells,scheduler,animator,positions,stats:()=>({reads,queries,lookups})};
}

test('an entire fourteen-tile chain uses one transform and no layout reads or queries during follow', () => {
  const f=layerFixture(14);
  f.animator.follow(f.positions,0,0);
  assert.equal(f.board.children.length,1);
  const layer=f.board.children[0];
  assert.equal(layer.children.length,14);
  assert.ok(Math.abs(parseFloat(layer.style.left)-3)<1e-8);
  const before=f.stats();
  let writes=0;
  layer.style=new Proxy(layer.style,{set(target,key,value){if(key==='transform')writes++;target[key]=value;return true;}});
  for(let frame=1;frame<=120;frame++)f.animator.follow(f.positions,frame/3,0);
  assert.deepEqual(f.stats(),before);
  assert.equal(writes,120);
  assert.equal(layer.style.transform,'translate3d(40px, 0px, 0)');
  for(const piece of f.pieces)assert.equal(piece.style.transform,'');
  for(const cell of f.cells)assert.equal(cell.classList.contains('drag-source'),true);
});

test('settling an overlay keeps sources hidden until it finishes then releases once', () => {
  const f=layerFixture();let complete=0;
  f.animator.follow(f.positions,11,0);
  f.animator.settleFollow(90,()=>complete++);
  assert.equal(f.board.children.length,1);
  assert.ok(f.cells.every(el=>el.classList.contains('drag-source')));
  f.scheduler.runFrame(f.scheduler.frameIds().at(-1));
  f.scheduler.runTimer(f.scheduler.timerIds().at(-1));
  assert.equal(f.board.children.length,0);
  assert.ok(f.cells.every(el=>!el.classList.contains('drag-source')));
  assert.equal(complete,1);
  f.scheduler.runTimer(f.scheduler.timerIds().at(-1));
  assert.equal(complete,1);
});

test('landing switches to real tiles before match effects rather than hiding exploding tiles', () => {
  const f=layerFixture();
  f.animator.follow(f.positions,41,0);
  f.animator.releaseFollow();
  f.animator.follow(f.positions,4,0,{useLayer:false});
  assert.equal(f.board.children.length,0);
  for(const cell of f.cells)assert.equal(cell.classList.contains('drag-source'),false);
  for(const piece of f.pieces)assert.equal(piece.style.transform,'translate3d(4px, 0px, 0)');
});

test('retained overlay callbacks cannot hide or remove a newer gesture', () => {
  const f=layerFixture();
  f.animator.follow(f.positions,11,0);
  f.animator.settleFollow(90);
  const oldFrame=f.scheduler.frameIds().at(-1);
  f.scheduler.runFrame(oldFrame);
  const oldTimer=f.scheduler.timerIds().at(-1);
  f.animator.cancelAll();
  f.animator.follow(f.positions,22,0);
  const current=f.board.children[0];
  f.scheduler.runFrame(oldFrame);f.scheduler.runTimer(oldTimer);
  assert.equal(f.board.children.length,1);
  assert.equal(f.board.children[0],current);
  assert.equal(current.style.transform,'translate3d(22px, 0px, 0)');
  assert.ok(f.cells.every(el=>el.classList.contains('drag-source')));
  f.animator.cancelAll();
  assert.equal(f.board.children.length,0);
  assert.ok(f.cells.every(el=>!el.classList.contains('drag-source')));
});
