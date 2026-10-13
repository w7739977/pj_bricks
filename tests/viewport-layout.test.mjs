import test from 'node:test';
import assert from 'node:assert/strict';
import { installViewportLayout } from '../dist/game/viewport-layout.js';

test('visible browser height selects compact HUD without altering tile pitch', () => {
  const saved = { window: globalThis.window, document: globalThis.document, raf: globalThis.requestAnimationFrame };
  const props = {}, classes = {}, listeners = {};
  const root = { clientWidth: 393, style: { setProperty: (k,v) => props[k]=v }, classList: { toggle: (k,v) => classes[k]=v } };
  globalThis.document = { documentElement: root };
  globalThis.window = { innerHeight: 852, visualViewport: { height: 664, addEventListener: (k,v) => listeners[k]=v }, addEventListener() {} };
  globalThis.requestAnimationFrame = callback => callback();
  try {
    installViewportLayout();
    assert.equal(props['--play-height'], '664px');
    assert.equal(classes['compact-browser'], true);
    assert.equal(props['--pitch'], undefined);
    window.visualViewport.height = 852;
    listeners.resize();
    assert.equal(classes['compact-browser'], false);
    assert.equal(props['--play-height'], '852px');
    window.visualViewport.height = 393;
    root.clientWidth = 852;
    listeners.resize();
    assert.equal(classes['compact-browser'], false);
  } finally {
    globalThis.window = saved.window;
    globalThis.document = saved.document;
    globalThis.requestAnimationFrame = saved.raf;
  }
});
