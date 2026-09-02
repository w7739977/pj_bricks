import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// interaction.js 顶层引用了 window/document，无法直接 import；
// 用静态解析校验其从 board.js 导入的名字全部真实导出，
// 防止"运行时 ReferenceError 但测试全绿"的盲区（真实事故：hasAnySolvablePairDeep 漏导入）
test('interaction.js imports only names exported by board.js', () => {
  const interaction = readFileSync(`${root}game/interaction.js`, 'utf8');
  const board = readFileSync(`${root}game/board.js`, 'utf8');

  const importBlock = interaction.match(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\/board\.js'/);
  assert.ok(importBlock, 'board.js import block found');

  const names = importBlock[1].split(',').map(s => s.trim()).filter(Boolean);
  assert.ok(names.length > 5, `expected several imports, got ${names.length}`);

  for (const name of names) {
    const exported = new RegExp(`export\\s+(?:function|const)\\s+${name}\\b`).test(board);
    assert.ok(exported, `board.js must export "${name}" (imported by interaction.js)`);
  }
});
