// 无头试玩冒烟测试：需要 chromium-headless-shell（已装入 ~/.cache/ms-playwright）。
// 浏览器缺失时自动跳过，不阻塞 `npm test`。
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { runPlaytest } from '../tools/playtest/playtest.mjs';

const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
const hasBrowser = existsSync(browsersDir) &&
  readdirSync(browsersDir).some(name => name.startsWith('chromium_headless_shell'));

test('__autoplay 无头试玩：第 1 关可消除、无 JS 错误', { skip: !hasBrowser ? '缺少 chromium-headless-shell' : false }, async () => {
  const report = await runPlaytest({ level: 1, maxSteps: 120, port: 3000 + Math.floor(Math.random() * 2000) });
  assert.ok(report.final, '能通过 __gameState 读取游戏状态');
  assert.ok(report.steps > 0, `至少完成一步消除（实际 ${report.steps} 步）`);
  assert.deepEqual(report.errors, [], '无页面 JS 错误');
  assert.ok(['playing', 'level-complete'].includes(report.final.phase), `终态合理：${report.final.phase}`);
});
