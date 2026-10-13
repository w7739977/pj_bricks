import test from 'node:test';
import assert from 'node:assert/strict';

import { ICON_LABELS, ICON_NAMES, ICONS } from '../dist/game/svg-icons.js';

const NEW_FRUITS = ['banana', 'orange', 'pear', 'cherry', 'peach', 'watermelon'];

test('six fruit icons follow the original fourteen icons', () => {
  assert.equal(ICON_NAMES.length, 20);
  assert.deepEqual(ICON_NAMES.slice(14), NEW_FRUITS);
});

test('every icon uses the shared veg svg contract', () => {
  for (const name of ICON_NAMES) {
    assert.match(
      ICONS[name],
      /^<svg class="veg" data-name="[^"]+" viewBox="0 0 64 64"/,
    );
  }
});

test('new fruit names occupy indices fourteen through nineteen', () => {
  NEW_FRUITS.forEach((name, offset) => {
    assert.equal(ICON_NAMES[14 + offset], name);
  });
});

test('new fruits provide Chinese labels for the unlock dialog', () => {
  assert.deepEqual(
    NEW_FRUITS.map(name => ICON_LABELS[name]),
    ['香蕉', '橙子', '梨', '樱桃', '桃子', '西瓜'],
  );
});

test('every character uses its own transparent PNG without nested atlas clipping', async () => {
  const {readFileSync} = await import('node:fs');
  const {SPRITE_URLS,withFace} = await import('../dist/game/svg-icons.js');
  assert.equal(new Set(Object.values(SPRITE_URLS)).size,20);
  for(const name of ICON_NAMES) {
    const url=SPRITE_URLS[name];
    const bitmap=readFileSync(new URL(`../dist${url}`,import.meta.url));
    assert.equal(bitmap.subarray(1,4).toString(),'PNG');
    assert.equal(bitmap.readUInt32BE(16),160);
    assert.equal(bitmap.readUInt32BE(20),160);
    assert.equal(bitmap[25],6);
    const svg=ICONS[name];
    assert.ok(svg.includes(`href="${url}"`));
    assert.equal((svg.match(/<svg/g)||[]).length,1);
    assert.equal(svg.includes('atlas'),false);
    assert.equal(withFace(svg,'happy'),svg);
  }
});
