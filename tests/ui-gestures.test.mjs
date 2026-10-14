import test from 'node:test';
import assert from 'node:assert/strict';
import { installGameTextGuard } from '../dist/game/ui-gestures.js';

test('UI guard blocks text menus and native dragging while leaving game input events alone', () => {
  const listeners=new Map();
  installGameTextGuard({addEventListener:(type,fn)=>listeners.set(type,fn)});
  assert.deepEqual([...listeners.keys()],['selectstart','contextmenu','dragstart']);
  let blocked=0;
  for(const handler of listeners.values()) {
    handler({cancelable:true,preventDefault:()=>blocked++});
    handler({cancelable:false,preventDefault:()=>assert.fail('uncancellable event')});
  }
  assert.equal(blocked,3);
  for(const type of ['click','pointerdown','pointermove','pointerup','touchstart','touchmove']) assert.equal(listeners.has(type),false);
});
