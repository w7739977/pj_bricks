import test from 'node:test';
import assert from 'node:assert/strict';

import { createDialogManager } from '../game/dialogs.js';

function fakeElement() {
  const listeners = new Map();
  return {
    open: false,
    textContent: '',
    innerHTML: '',
    hidden: false,
    parts: {},
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      const event = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      [...(listeners.get(type) || [])].forEach(listener => listener(event));
      return event;
    },
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    querySelector(selector) {
      return this.parts[selector];
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

function fixture() {
  const elements = new Map();
  for (const id of ['completeDialog', 'deadlockDialog', 'failureDialog']) {
    const dialog = fakeElement();
    dialog.parts = {
      '[data-complete-next]': fakeElement(),
      '[data-deadlock-retry]': fakeElement(),
      '[data-deadlock-reshuffle]': fakeElement(),
      '[data-failure-action]': fakeElement(),
    };
    elements.set(id, dialog);
  }
  for (const id of [
    'completeTitle',
    'completeDesc',
    'completeSummary',
    'completeUnlock',
    'failureTitle',
    'failureDesc',
  ]) {
    elements.set(id, fakeElement());
  }
  return {
    elements,
    manager: createDialogManager({ getDialog: id => elements.get(id) }),
  };
}

test('completion settles only once and prevents cancel', async () => {
  const { elements, manager } = fixture();
  const dialog = elements.get('completeDialog');
  const next = dialog.parts['[data-complete-next]'];
  const pending = manager.showLevelComplete({
    levelNumber: 1,
    nextLevelNumber: 2,
    hintsRemaining: 2,
    reshufflesRemaining: 1,
    unlockedIconSvg: '',
  });

  assert.equal(dialog.dispatch('cancel').defaultPrevented, true);
  next.dispatch('click');
  next.dispatch('click');

  assert.equal(await pending, 'next');
  assert.equal(dialog.open, false);
});

test('closeAll resolves cancelled and removes active listeners', async () => {
  const { elements, manager } = fixture();
  const pending = manager.showDeadlock();

  manager.closeAll();

  assert.equal(await pending, 'cancelled');
  assert.equal(elements.get('deadlockDialog').open, false);
  assert.equal(elements.get('deadlockDialog').listenerCount('cancel'), 0);
});

test('reopening a dialog cancels the prior session and keeps one listener set', async () => {
  const { elements, manager } = fixture();
  const first = manager.showFailure({
    title: '失败',
    description: 'A',
    actionLabel: '重试',
  });

  const second = manager.showFailure({
    title: '失败',
    description: 'B',
    actionLabel: '重试',
  });

  assert.equal(await first, 'cancelled');
  assert.equal(elements.get('failureDialog').listenerCount('cancel'), 1);
  elements.get('failureDialog').parts['[data-failure-action]'].dispatch('click');
  assert.equal(await second, 'retry');
});

test('dialog manager writes completion and failure content', async () => {
  const { elements, manager } = fixture();
  const completion = manager.showLevelComplete({
    levelNumber: 4,
    nextLevelNumber: 5,
    hintsRemaining: 1,
    reshufflesRemaining: 0,
    unlockedIconSvg: '<svg></svg>',
  });

  assert.equal(elements.get('completeTitle').textContent, '第 4 关完成！');
  assert.match(elements.get('completeSummary').textContent, /提示剩余 1/);
  assert.equal(elements.get('completeUnlock').hidden, false);
  manager.closeAll();
  assert.equal(await completion, 'cancelled');

  const failure = manager.showFailure({
    title: '重排失败',
    description: '请重试本关。',
    actionLabel: '重试本关',
  });
  assert.equal(elements.get('failureTitle').textContent, '重排失败');
  assert.equal(elements.get('failureDesc').textContent, '请重试本关。');
  manager.closeAll();
  assert.equal(await failure, 'cancelled');
});
