import test from 'node:test';
import assert from 'node:assert/strict';
import { installEdgeGestureGuard } from '../dist/game/edge-gesture.js';

test('edge touch guard cancels eligible tile starts without capturing middle, empty or multi-touch starts', () => {
  let listener,options,prevented=0;
  installEdgeGestureGuard({addEventListener:(type,fn,opts)=>{assert.equal(type,'touchstart');listener=fn;options=opts;}}, {
    canStart: target=>target==='tile',getWidth:()=>393,
  });
  assert.equal(options.passive,false);
  const run=(x,{cancelable=true,target='tile',count=1}={})=>listener({cancelable,target,touches:Array.from({length:count},()=>({clientX:x})),preventDefault:()=>prevented++});
  run(25);run(368);assert.equal(prevented,2);
  run(196);run(25,{target:'empty'});run(25,{cancelable:false});run(25,{count:2});
  assert.equal(prevented,2);
});
