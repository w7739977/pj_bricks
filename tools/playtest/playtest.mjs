// pj_bricks 无头试玩（借鉴 dsh-game-studio 的 game_studio_playtest 思路）
// 用法: node tools/playtest/playtest.mjs [--level N] [--max-steps N] [--shot out.png]
// 依赖: playwright-core（符号链接到 DSH profile 内的副本）+ chromium-headless-shell
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
let chromium;
try {
  chromium = require('playwright-core');
} catch {
  // tools/playtest/node_modules/playwright-core → DSH profile 副本
  const link = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', 'playwright-core');
  chromium = require(link);
}

function parseArgs(argv) {
  const opts = { level: 1, maxSteps: 200, shot: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--level') opts.level = Number(argv[++i]);
    else if (argv[i] === '--max-steps') opts.maxSteps = Number(argv[++i]);
    else if (argv[i] === '--shot') opts.shot = argv[++i];
  }
  return opts;
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    child.stdout.on('data', () => { if (!ready) { ready = true; resolve(child); } });
    child.on('error', reject);
    setTimeout(() => { if (!ready) reject(new Error('server 启动超时')); }, 5000);
  });
}

async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`等待超时: ${label}`);
    await new Promise(r => setTimeout(r, 100));
  }
}

export async function runPlaytest({ level = 1, maxSteps = 200, shot = null, port = 0 } = {}) {
  const errors = [];
  const server = await startServer(port);
  const baseUrl = `http://localhost:${port}`;
  let browser;
  try {
    browser = await chromium.chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const url = `${baseUrl}/?autoplay=1&perf=1`;
    await page.goto(url, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__gameState?.()), 10000, '游戏初始化');

    const fpsSamples = [];
    let last = await page.evaluate(() => performance.now());
    const t0 = last;
    let steps = 0, waits = 0;
    while (steps < maxSteps) {
      const result = await page.evaluate(() => window.__autoplay());
      const now = await page.evaluate(() => performance.now());
      if (now > last + 1000) {
        fpsSamples.push(steps / ((now - t0) / 1000));
        last = now;
      }
      if (result.action === 'stop') break;
      if (result.action === 'wait') { waits++; if (waits > 500) break; await page.waitForTimeout(60); continue; }
      steps++;
      // 等待消除动画结束（busy 回落为 false），最多 3s
      await waitFor(async () => {
        const s = await page.evaluate(() => window.__gameState());
        return !s.busy ? s : null;
      }, 3000, '消除动画结束');
      await page.waitForTimeout(40);
    }
    const final = await page.evaluate(() => window.__gameState());
    const fps = await page.evaluate(() => new Promise(resolve => {
      let frames = 0; const t = performance.now();
      const tick = () => { frames++; if (performance.now() - t >= 1000) resolve(frames); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    if (shot) await page.screenshot({ path: path.resolve(shot), fullPage: false });
    return { steps, waits, final, fps, errors, elapsedMs: Math.round(await page.evaluate(() => performance.now()) - t0) };
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

// CLI 入口：修正常量端口（server.js 只认显式 PORT）
if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  const port = 3000 + Math.floor(Math.random() * 2000);
  try {
    const report = await runPlaytest({ ...opts, port });
    console.log(JSON.stringify({ ...report, level: opts.level }, null, 2));
    process.exit(report.errors.length === 0 ? 0 : 1);
  } catch (e) {
    console.error('[playtest] 失败:', e.message);
    process.exit(2);
  }
}
