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

test('Q characters share a local transparent atlas and do not add a second face overlay', async () => {
  const {readFileSync} = await import('node:fs');
  const {ATLAS_URL,withFace} = await import('../dist/game/svg-icons.js');
  const bitmap = readFileSync(new URL(`../dist${ATLAS_URL}`,import.meta.url));
  assert.equal(bitmap.subarray(1,4).toString(),'PNG');
  const width = bitmap.readUInt32BE(16),height=bitmap.readUInt32BE(20);
  assert.equal(bitmap[25],6,'RGBA PNG preserves the transparent background');
  for(const name of ICON_NAMES) {
    const svg=ICONS[name];
    assert.ok(svg.includes(`href="${ATLAS_URL}"`));
    const nested=svg.match(/width="64" height="64" viewBox="([^"]+)"/);
    assert.ok(nested);
    const [x,y,w,h]=nested[1].split(' ').map(Number);
    assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height);
    assert.equal(withFace(svg,'happy'),svg);
    assert.equal(withFace(svg,'shock'),svg);
  }
});
