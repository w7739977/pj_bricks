import test from 'node:test';
import assert from 'node:assert/strict';

import { ICON_NAMES, ICONS } from '../game/svg-icons.js';

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
