import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameAudio} from '../dist/game/game-audio.js';

test('audio absence and denied storage do not block gameplay feedback', () => {
  const audio=createGameAudio();
  const button={textContent:'',setAttribute(){},addEventListener(){}};
  assert.doesNotThrow(()=>{
    audio.installToggle(button,{getItem(){throw Error('denied');}});
    audio.wake();audio.pick();audio.drop();audio.block();audio.match(5);audio.suspend();
  });
});

test('saved mute prevents context creation; explicit toggle restores audio and persists preference', () => {
  const previous=globalThis.AudioContext;
  let created=0, callback;const saved=new Map([['pj-bricks.sound','off']]);
  const attrs=new Map();
  globalThis.AudioContext=class {state='running';currentTime=0;constructor(){created++;}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}};
  try{
    const audio=createGameAudio();
    audio.installToggle({setAttribute:(k,v)=>attrs.set(k,v),addEventListener:(t,fn)=>callback=fn}, {getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)});
    audio.wake();audio.match();assert.equal(created,0);assert.equal(attrs.get('aria-pressed'),'false');
    callback();assert.equal(created,1);assert.equal(saved.get('pj-bricks.sound'),'on');assert.equal(attrs.get('aria-pressed'),'true');
  }finally{globalThis.AudioContext=previous;}
});
