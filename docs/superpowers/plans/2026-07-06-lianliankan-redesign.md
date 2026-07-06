# 田园连连看 重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前单文件连连看改造为多文件、Claymorphism 漫画风、14×10 竖版、带死局弹框与全部 A 类 Bug 修复的版本。

**Architecture:** 原生 ES Modules，无构建工具。`board.js` 为纯函数模块（无 DOM 依赖），`interaction.js` 持状态并操作 DOM，`dialogs.js` 用原生 `<dialog>` 元素管理弹框，`svg-icons.js` 提供 14 个漫画蔬菜 SVG 字符串。

**Tech Stack:** Vanilla JS (ES Modules), CSS Grid + Custom Properties, Google Fonts (Baloo 2 / ZCOOL KuaiLe / Noto Sans SC), 原生 `<dialog>`, Node http 服务器。

**Spec:** `docs/superpowers/specs/2026-07-06-lianliankan-redesign-design.md`

## Global Constraints

- 服务器端口固定 3013，访问 `/` 加载 `index.html`
- 棋盘固定 14 行 × 10 列（共 140 格），14 种蔬菜各 10 个
- 消除规则保留"0 折直线"（行/列同线无阻挡）
- 单元格 pitch（中心距）由 CSS 决定，JS 动态测量，禁止硬编码
- 所有异步窗口必须正确管理 `state.busy` 以阻塞输入
- `prefers-reduced-motion` 必须支持降级
- 不引入构建工具、不引入测试框架（验证靠手测 + DevTools）
- 中文注释与文案

---

## File Structure

```
pj_bricks/
├── index.html              # 结构 + critical CSS + module 入口
├── server.js               # 静态服务器（css/js/svg 路由 + MIME）
├── styles.css              # Claymorphism 令牌 + 组件 + 响应式
├── game/
│   ├── main.js             # 启动 + 字体加载 + 全局事件
│   ├── board.js            # 纯函数：createBoard/findTargets/isClearPath/findSolvablePair/reshuffle/applyShift
│   ├── svg-icons.js        # 14 SVG + withFace 叠加
│   ├── dialogs.js          # showDeadlock/showGameOver/showWin（返回 Promise）
│   └── interaction.js      # state + DOM 渲染 + 点击/拖拽/状态机/动画
└── docs/superpowers/{specs,plans}/...
```

模块依赖：`main.js` → `interaction.js` → `board.js` + `svg-icons.js` + `dialogs.js`。`board.js` 无任何 import。

---

### Task 1: 文件脚手架 + server.js 静态路由

**Files:**
- Create: `styles.css`（空占位 + 1 行注释）
- Create: `game/main.js`、`game/board.js`、`game/svg-icons.js`、`game/dialogs.js`、`game/interaction.js`（每个文件仅 `// placeholder` + 空 export）
- Modify: `index.html`（删除原 IIFE，替换为 module 入口；保留 body 结构；加 fonts）
- Modify: `server.js`（增加 MIME 路由）

**Interfaces:**
- Produces: `server.js` 监听 3013；`/`、`/styles.css`、`/game/*.js`、`/favicon.ico` 均返回正确 MIME
- Produces: `index.html` 中 `<script type="module" src="/game/main.js"></script>`

- [ ] **Step 1: 替换 `server.js`**

完整内容写入 `server.js`：

```js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3013;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // 安全：禁止路径穿越
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url.includes('..')) { res.writeHead(400); res.end('Bad Request'); return; }

  let filePath = url === '/' ? '/index.html' : url;
  const full = path.join(ROOT, filePath);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`pj_bricks game running at http://localhost:${PORT}`);
});
```

- [ ] **Step 2: 替换 `index.html` 结构（保留 body，删 IIFE，加字体 + module）**

完整内容写入 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>田园连连看</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="topbar">
    <h1 class="title">田园连连看</h1>
    <div class="meta" id="meta">第 <span id="round">1</span> 局</div>
  </header>

  <p id="tip" class="tip" aria-live="polite"></p>

  <main class="board-wrap">
    <div id="board" class="board" role="grid" aria-label="连连看棋盘"></div>
  </main>

  <nav class="controls" aria-label="工具">
    <button class="tool tool--hint" id="hintBtn" type="button" aria-label="提示">💡 提示</button>
    <button class="tool tool--shuffle" id="shuffleBtn" type="button" aria-label="手动重排">🔀 重排</button>
    <button class="tool tool--restart" id="restartBtn" type="button" aria-label="重新开始">🔄 重开</button>
  </nav>

  <!-- 胜利弹框 -->
  <dialog id="winDialog" class="dialog dialog--win">
    <div class="dialog__card">
      <button class="dialog__close" data-close type="button" aria-label="关闭">✕</button>
      <h2 class="dialog__title">🎉 游戏胜利！</h2>
      <p class="dialog__desc">所有方块已消除完毕</p>
      <div class="dialog__actions">
        <button class="tool tool--primary" data-win-restart type="button">再来一局</button>
      </div>
    </div>
  </dialog>

  <!-- 死局弹框（首次） -->
  <dialog id="deadlockDialog" class="dialog dialog--deadlock">
    <div class="dialog__card">
      <h2 class="dialog__title">😵 陷入死局</h2>
      <p class="dialog__desc">当前盘面已无可消除对，要怎么处理？</p>
      <div class="dialog__actions">
        <button class="tool tool--secondary" data-deadlock-giveup type="button">🏳️ 放弃本局</button>
        <button class="tool tool--primary" data-deadlock-reshuffle type="button">🔀 重排一次</button>
      </div>
    </div>
  </dialog>

  <!-- 游戏结束弹框（二次及以后死局） -->
  <dialog id="gameOverDialog" class="dialog dialog--gameover">
    <div class="dialog__card">
      <h2 class="dialog__title">💔 游戏结束</h2>
      <p class="dialog__desc" id="gameOverDesc">本局共出现 2 次死局</p>
      <div class="dialog__actions">
        <button class="tool tool--primary" data-gameover-restart type="button">🏳️ 放弃本局并重开</button>
      </div>
    </div>
  </dialog>

  <script type="module" src="/game/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: 创建空模块文件**

每个文件 1 行注释占位：
- `styles.css`：`/* Claymorphism 设计令牌 — Task 3 填充 */`
- `game/main.js`：`// 启动入口 — Task 11 填充`
- `game/board.js`：`// 纯棋盘函数 — Task 4 填充`
- `game/svg-icons.js`：`// 14 个漫画 SVG — Task 2 填充`
- `game/dialogs.js`：`// 弹框管理 — Task 5 填充`
- `game/interaction.js`：`// 状态与交互 — Task 7-10 填充`

- [ ] **Step 4: 启动服务器并验证路由**

Run: `node /home/ubuntu/pj_bricks/server.js &`
Run: `curl -sI http://localhost:3013/ | head -3` → 期望 `200` + `text/html`
Run: `curl -sI http://localhost:3013/styles.css | head -3` → 期望 `200` + `text/css`
Run: `curl -sI http://localhost:3013/game/main.js | head -3` → 期望 `200` + `application/javascript`
Run: `curl -sI http://localhost:3013/game/../server.js | head -3` → 期望 `403` 或 `400`
Run: `kill %1`

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/pj_bricks
git init 2>/dev/null || true
git add -A
git commit -m "chore: scaffold multi-file structure and static server routes"
```

---

### Task 2: 14 个漫画蔬菜 SVG 字符串模块

**Files:**
- Create (overwrite placeholder): `game/svg-icons.js`

**Interfaces:**
- Produces: `export const ICON_NAMES = ['broccoli','lettuce','tomato','carrot','corn','eggplant','onion','potato','cucumber','pepper','pumpkin','grape','apple','strawberry']`（14 项，顺序固定，对应原 EMOJIS 顺序，最后一项替换拖拉机）
- Produces: `export const ICONS = { broccoli: '<svg>...</svg>', ... }`（每个 SVG 字符串，viewBox `0 0 64 64`，根节点必须带 `class="veg"` 和 `data-name="${name}"`）
- Produces: `export function withFace(svg, face)` —— 在 `</svg>` 前注入 `<g class="face face--${face}">...</g>`；face 取值 `'happy'`（眯眼笑）| `'shock'`（惊讶 O 嘴）| `null`（清除）

**SVG 设计规范**（统一）：
- viewBox `0 0 64 64`
- 描边 `stroke="#2E1F1A"` 颜色 `#2E1F1A`（深棕黑），`stroke-width="3"`，`stroke-linejoin="round"`，`stroke-linecap="round"`
- 每个蔬菜顶部一抹白色高光椭圆（`fill="#fff"` `opacity="0.35"`）
- 表情叠加层（`withFace` 注入）：
  - `happy`：两个 `^ ^` 弧线眼睛（`path d="M22 36 Q26 32 30 36"` 镜像）+ 嘴 `path d="M28 42 Q32 45 36 42"`
  - `shock`：两个圆点眼睛 + 圆嘴 `<circle cx="32" cy="42" r="3" fill="#2E1F1A"/>`

- [ ] **Step 1: 写 `game/svg-icons.js`**

完整文件（结构示意，14 个 SVG 全部展开）：

```js
// 14 个田园漫画蔬菜/水果 SVG。
// viewBox 统一 0 0 64 64；3px 深棕描边；白色高光椭圆。
// 顺序对应 board.js 中的 ICON_NAMES。

const S = (name, body) => `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">${body}<ellipse cx="22" cy="20" rx="6" ry="3" fill="#fff" opacity="0.35"/></svg>`;

export const ICON_NAMES = [
  'broccoli', 'lettuce', 'tomato', 'carrot', 'corn',
  'eggplant', 'onion', 'potato', 'cucumber', 'pepper',
  'pumpkin', 'grape', 'apple', 'strawberry',
];

export const ICONS = {
  broccoli: S('broccoli', `
    <path d="M20 24 Q14 18 18 12 Q22 6 30 10 Q38 4 44 10 Q52 8 50 18 Q56 22 50 28 Q52 36 42 36 L26 36 Q18 36 20 24 Z" fill="#43A047" stroke-width="3"/>
    <path d="M30 34 L28 54 L36 54 L34 34 Z" fill="#9CCC65" stroke-width="3"/>
  `),
  lettuce: S('lettuce', `
    <path d="M10 36 Q8 22 22 20 Q26 10 38 14 Q50 10 52 24 Q60 30 52 42 Q46 54 30 52 Q14 50 10 36 Z" fill="#7CB342" stroke-width="3"/>
    <path d="M22 30 Q26 26 30 30 M34 26 Q38 22 42 26 M26 40 Q30 36 34 40" stroke="#558B2F" stroke-width="2" fill="none"/>
  `),
  tomato: S('tomato', `
    <circle cx="32" cy="38" r="20" fill="#E53935" stroke-width="3"/>
    <path d="M22 18 L26 12 L30 18 L34 12 L38 18 L42 12 L46 18 L42 22 L22 22 Z" fill="#43A047" stroke-width="3"/>
  `),
  carrot: S('carrot', `
    <path d="M32 8 L24 22 L26 50 Q32 56 38 50 L40 22 Z" fill="#FB8C00" stroke-width="3"/>
    <path d="M28 32 L34 30 M26 40 L34 38 M28 46 L36 44" stroke="#E65100" stroke-width="2"/>
    <path d="M28 14 L22 4 L26 12 L32 2 L32 12 L38 4 L42 14 L36 12" fill="#43A047" stroke-width="3"/>
  `),
  corn: S('corn', `
    <path d="M22 16 Q32 8 42 16 L40 52 Q32 58 24 52 Z" fill="#FDD835" stroke-width="3"/>
    <path d="M14 18 Q22 12 28 22 L18 50 Q12 44 14 32 Z" fill="#7CB342" stroke-width="3"/>
    <path d="M50 18 Q42 12 36 22 L46 50 Q52 44 50 32 Z" fill="#7CB342" stroke-width="3"/>
    <circle cx="28" cy="24" r="2" fill="#F9A825"/><circle cx="34" cy="26" r="2" fill="#F9A825"/>
    <circle cx="26" cy="32" r="2" fill="#F9A825"/><circle cx="32" cy="34" r="2" fill="#F9A825"/>
    <circle cx="28" cy="42" r="2" fill="#F9A825"/><circle cx="34" cy="44" r="2" fill="#F9A825"/>
  `),
  eggplant: S('eggplant', `
    <path d="M22 18 Q14 26 18 42 Q22 56 34 56 Q48 56 48 40 Q48 24 38 20 Z" fill="#7E57C2" stroke-width="3"/>
    <path d="M22 18 L18 8 L26 14 L30 4 L34 14 L42 6 L40 18 Z" fill="#43A047" stroke-width="3"/>
  `),
  onion: S('onion', `
    <path d="M32 8 Q12 24 18 44 Q24 58 32 58 Q40 58 46 44 Q52 24 32 8 Z" fill="#C490D1" stroke-width="3"/>
    <path d="M32 8 L32 58 M24 22 Q32 28 40 22 M22 36 Q32 42 42 36" stroke="#7B1FA2" stroke-width="2" fill="none"/>
    <path d="M30 8 L26 2 L34 2 Z" fill="#558B2F" stroke-width="3"/>
  `),
  potato: S('potato', `
    <path d="M14 30 Q12 18 24 14 Q40 10 50 22 Q56 36 46 50 Q32 56 20 48 Q12 40 14 30 Z" fill="#A1887F" stroke-width="3"/>
    <circle cx="22" cy="26" r="2" fill="#5D4037"/><circle cx="36" cy="22" r="2" fill="#5D4037"/>
    <circle cx="44" cy="34" r="2" fill="#5D4037"/><circle cx="28" cy="42" r="2" fill="#5D4037"/>
  `),
  cucumber: S('cucumber', `
    <path d="M8 38 Q6 22 18 18 Q34 12 48 18 Q58 26 54 40 Q48 52 32 50 Q16 50 8 38 Z" fill="#558B2F" stroke-width="3" transform="rotate(-20 32 32)"/>
    <circle cx="22" cy="28" r="1.5" fill="#33691E"/><circle cx="32" cy="24" r="1.5" fill="#33691E"/>
    <circle cx="42" cy="30" r="1.5" fill="#33691E"/><circle cx="28" cy="36" r="1.5" fill="#33691E"/>
    <circle cx="38" cy="40" r="1.5" fill="#33691E"/>
  `),
  pepper: S('pepper', `
    <path d="M22 20 Q14 28 18 44 Q22 56 32 54 Q44 50 44 36 Q42 24 32 22 Z" fill="#2E7D32" stroke-width="3"/>
    <path d="M28 22 L22 12 L32 18 L36 8 L40 18" fill="#388E3C" stroke-width="3"/>
  `),
  pumpkin: S('pumpkin', `
    <ellipse cx="20" cy="38" rx="10" ry="16" fill="#F57C00" stroke-width="3"/>
    <ellipse cx="32" cy="38" rx="14" ry="18" fill="#FB8C00" stroke-width="3"/>
    <ellipse cx="44" cy="38" rx="10" ry="16" fill="#F57C00" stroke-width="3"/>
    <path d="M32 14 L30 8 L34 8 Z" fill="#5D4037" stroke-width="3"/>
  `),
  grape: S('grape', `
    <circle cx="24" cy="30" r="6" fill="#8E24AA" stroke-width="3"/>
    <circle cx="36" cy="30" r="6" fill="#8E24AA" stroke-width="3"/>
    <circle cx="30" cy="38" r="6" fill="#7B1FA2" stroke-width="3"/>
    <circle cx="42" cy="40" r="6" fill="#8E24AA" stroke-width="3"/>
    <circle cx="24" cy="44" r="6" fill="#7B1FA2" stroke-width="3"/>
    <circle cx="34" cy="48" r="6" fill="#6A1B9A" stroke-width="3"/>
    <path d="M30 18 L26 8 L36 4 L40 14 Z" fill="#43A047" stroke-width="3"/>
  `),
  apple: S('apple', `
    <path d="M18 28 Q14 16 26 14 Q32 12 32 22 Q32 12 38 14 Q50 16 46 28 Q50 48 38 54 Q32 56 26 54 Q14 48 18 28 Z" fill="#D32F2F" stroke-width="3"/>
    <path d="M32 18 L30 8 L36 6" stroke="#5D4037" stroke-width="3" fill="none"/>
    <path d="M36 12 Q44 8 46 16 Q40 18 36 14 Z" fill="#43A047" stroke-width="3"/>
  `),
  strawberry: S('strawberry', `
    <path d="M32 14 Q14 18 22 40 Q28 56 32 56 Q36 56 42 40 Q50 18 32 14 Z" fill="#E91E63" stroke-width="3"/>
    <path d="M22 14 L26 4 L30 12 L34 4 L38 12 L42 4 L46 14 Q34 18 22 14 Z" fill="#43A047" stroke-width="3"/>
    <circle cx="26" cy="28" r="1.6" fill="#FFEB3B"/><circle cx="34" cy="26" r="1.6" fill="#FFEB3B"/>
    <circle cx="38" cy="32" r="1.6" fill="#FFEB3B"/><circle cx="28" cy="36" r="1.6" fill="#FFEB3B"/>
    <circle cx="36" cy="40" r="1.6" fill="#FFEB3B"/><circle cx="30" cy="44" r="1.6" fill="#FFEB3B"/>
  `),
};

// 在 svg 闭合前注入表情层
export function withFace(svg, face) {
  if (!face) return svg.replace(/<g class="face[^"]*">[\s\S]*?<\/g>\s*(<\/svg>)/, '$1');
  const layer = face === 'happy'
    ? `<g class="face face--happy">
         <path d="M22 36 Q26 32 30 36" stroke="#2E1F1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
         <path d="M34 36 Q38 32 42 36" stroke="#2E1F1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
         <path d="M27 42 Q32 46 37 42" stroke="#2E1F1A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
       </g>`
    : `<g class="face face--shock">
         <circle cx="26" cy="36" r="2" fill="#2E1F1A"/>
         <circle cx="38" cy="36" r="2" fill="#2E1F1A"/>
         <circle cx="32" cy="44" r="3" fill="#2E1F1A"/>
       </g>`;
  return svg.replace('</svg>', `${layer}</svg>`);
}
```

- [ ] **Step 2: 浏览器手测**

启动服务器，临时在 `game/main.js` 写：
```js
import { ICONS, ICON_NAMES, withFace } from './svg-icons.js';
document.getElementById('board').innerHTML = ICON_NAMES.map(n => ICONS[n]).join('') + withFace(ICONS.tomato, 'happy');
```
打开 `http://localhost:3013`，确认 14 个蔬菜都能渲染、最后一个为草莓、加表情的番茄有眯眼笑。验证后清空 main.js 回到占位。

- [ ] **Step 3: Commit**

```bash
git add game/svg-icons.js
git commit -m "feat: add 14 comic-style vegetable SVG icons with face overlay"
```

---

### Task 3: styles.css — Claymorphism 令牌 + 14×10 竖版响应式布局

**Files:**
- Create (overwrite): `styles.css`

**Interfaces:**
- Produces: CSS 变量 `--color-primary`、`--color-bg`、`--pitch`、`--radius-cell` 等
- Produces: `.board` 使用 CSS Grid `grid-template-columns: repeat(10, var(--pitch))` `grid-template-rows: repeat(14, var(--pitch))`
- Produces: `.cell` `aspect-ratio: 1`；`.cell.selected` 黄色 ring；`.cell.hint` 绿色 blink；`.cell.empty` 透明；`.cell.shake` 抖动
- Produces: `.dialog` + `.dialog__card` Claymorphism 卡片；`.dialog[open]` 入场动画；`::backdrop` 50% 黑 + 5px blur
- Produces: `@media (prefers-reduced-motion: reduce)` 关闭所有 transition/animation
- Produces: 响应式断点 `< 480`、`480–768`、`≥ 768` 调整 `--pitch`

- [ ] **Step 1: 写 `styles.css`**

完整文件：

```css
/* ===== Claymorphism 设计令牌 ===== */
:root {
  --color-primary: #EC4899;
  --color-on-primary: #FFFFFF;
  --color-secondary: #8B5CF6;
  --color-accent: #F59E0B;
  --color-bg: #FDF2F8;
  --color-fg: #0F172A;
  --color-muted: #FDF4F8;
  --color-border: #FCE9F2;
  --color-destructive: #DC2626;
  --color-ring: #EC4899;

  --radius-board: 32px;
  --radius-cell: 12px;
  --radius-button: 24px;

  --shadow-soft: 0 8px 24px rgba(139, 92, 246, 0.18);
  --shadow-clay: 0 12px 32px rgba(236, 72, 153, 0.22), inset 0 0 0 2px rgba(255,255,255,0.65);
  --shadow-press: 0 4px 12px rgba(236, 72, 153, 0.28);

  --pitch: 35px;  /* 移动端默认，断点处覆盖 */
  --font-title: 'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif;
  --font-body: 'Baloo 2', 'Noto Sans SC', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  min-height: 100dvh;
  font-family: var(--font-body);
  background:
    radial-gradient(circle at 15% 20%, rgba(236, 72, 153, 0.12), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(139, 92, 246, 0.12), transparent 40%),
    linear-gradient(160deg, #fdf2f8 0%, #fce7f3 50%, #f5d0fe 100%);
  color: var(--color-fg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  gap: 10px;
  overflow-x: hidden;
}

/* ===== 顶栏 ===== */
.topbar {
  width: 100%;
  max-width: 520px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 8px;
}
.title {
  font-family: var(--font-title);
  font-size: clamp(22px, 5vw, 32px);
  color: var(--color-primary);
  text-shadow: 1px 1px 0 #fff;
  letter-spacing: 2px;
}
.meta { font-size: 14px; color: var(--color-secondary); font-weight: 600; }
.meta #round { font-variant-numeric: tabular-nums; }

/* ===== 提示文字 ===== */
.tip {
  min-height: 22px;
  font-size: 14px;
  color: var(--color-destructive);
  font-weight: 600;
  text-align: center;
}

/* ===== 棋盘 ===== */
.board-wrap { width: 100%; display: flex; justify-content: center; }
.board {
  display: grid;
  grid-template-columns: repeat(10, var(--pitch));
  grid-template-rows: repeat(14, var(--pitch));
  gap: 3px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-board);
  box-shadow: var(--shadow-clay);
}
.cell {
  width: var(--pitch);
  height: var(--pitch);
  background: #fff;
  border-radius: var(--radius-cell);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  box-shadow: var(--shadow-soft), inset 0 0 0 1px rgba(236, 72, 153, 0.08);
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
}
.cell:hover { transform: translateY(-2px); }
.cell.selected {
  background: #fef3c7;
  box-shadow: 0 0 0 3px var(--color-accent), var(--shadow-soft);
  transform: translateY(-2px);
}
.cell.hint {
  animation: blink 0.5s ease-in-out infinite alternate;
}
@keyframes blink {
  from { box-shadow: 0 0 0 3px var(--color-primary), 0 0 10px rgba(236,72,153,0.6); background: #fce7f3; }
  to   { box-shadow: 0 0 0 3px #f472b6, 0 0 18px rgba(236,72,153,0.9); background: #fbcfe8; }
}
.cell.shake { animation: shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@keyframes shake {
  10%, 90%  { transform: translateX(-2px) rotate(-3deg); }
  20%, 80%  { transform: translateX(4px) rotate(5deg); }
  30%, 50%, 70% { transform: translateX(-6px) rotate(-7deg); }
  40%, 60%  { transform: translateX(6px) rotate(7deg); }
}
.cell.empty {
  background: transparent;
  box-shadow: none;
  cursor: default;
}
.cell.empty:hover { transform: none; }
.cell .veg { width: 78%; height: 78%; pointer-events: none; }

/* ===== 工具按钮 ===== */
.controls { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.tool {
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 700;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-button);
  cursor: pointer;
  color: var(--color-on-primary);
  background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
}
.tool:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(139,92,246,0.45); }
.tool:active { transform: scale(0.94); }
.tool--hint { background: linear-gradient(135deg, var(--color-accent), #d97706); }
.tool--shuffle { background: linear-gradient(135deg, #10b981, #047857); }
.tool--restart { background: linear-gradient(135deg, var(--color-secondary), #6d28d9); }
.tool--primary { background: linear-gradient(135deg, var(--color-primary), #be185d); }
.tool--secondary { background: linear-gradient(135deg, #94a3b8, #475569); }

/* ===== 弹框 ===== */
.dialog { padding: 0; border: none; background: transparent; max-width: 90vw; }
.dialog::backdrop { background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(5px); }
.dialog[open] { animation: dialog-in 0.2s ease-out; }
.dialog[open]::backdrop { animation: backdrop-in 0.2s ease-out; }
@keyframes dialog-in {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
.dialog__card {
  position: relative;
  background: #fff;
  padding: 32px 36px 24px;
  border-radius: 28px;
  box-shadow: 0 20px 60px rgba(236, 72, 153, 0.35), inset 0 0 0 2px rgba(255,255,255,0.8);
  text-align: center;
  min-width: 280px;
}
.dialog__title { font-family: var(--font-title); font-size: 26px; color: var(--color-primary); margin-bottom: 8px; }
.dialog__desc { font-size: 14px; color: #475569; margin-bottom: 20px; }
.dialog__actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.dialog__close {
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px;
  border: none; background: transparent;
  font-size: 16px; color: #94a3b8;
  cursor: pointer; border-radius: 50%;
}
.dialog__close:hover { background: #f1f5f9; color: #475569; }

/* ===== 响应式：根据视口调整 pitch ===== */
@media (min-width: 480px) { :root { --pitch: 40px; } }
@media (min-width: 768px) { :root { --pitch: 48px; } .board { gap: 4px; } }

/* ===== 降级：reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .cell:hover { transform: none; }
  .tool:hover { transform: none; }
}
```

- [ ] **Step 2: 浏览器手测**

`game/main.js` 临时写：
```js
const b = document.getElementById('board');
for (let i = 0; i < 140; i++) {
  const c = document.createElement('div');
  c.className = i % 7 === 0 ? 'cell empty' : 'cell';
  c.textContent = i;
  b.appendChild(c);
}
```
打开页面，确认：
- 棋盘是 10 列 14 行
- 375px / 768px / 1440px 三档无横向滚动
- 单元格圆角 + 柔光阴影
- 测一单元格实际中心距 → 控制台应接近 35/40/48（用于 Task 8 校验）
测后清空 main.js。

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: claymorphism design tokens and 14x10 vertical responsive board"
```

---

### Task 4: board.js — 纯棋盘函数

**Files:**
- Create (overwrite): `game/board.js`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export const ROWS = 14, COLS = 10, KINDS = 14, PER_KIND = 10`（140 格保证）
  - `export function createBoard(rng = Math.random)` → 返回 `{ board: string[KINDS][ROWS][COLS], deadlockCount: 0 }`（开局必可解，内部 while reshuffle）
  - `export function isClearPath(board, r1, c1, r2, c2)` → bool
  - `export function findTargets(board, r, c)` → `[{r,c}]`（四方向直线首个同图案）
  - `export function findSolvablePair(board)` → `{r1,c1,r2,c2} | null`
  - `export function hasAnySolvablePair(board)` → bool
  - `export function reshuffleInPlace(board, rng)` → 就地洗牌并保证可解（attempts 上限 1000，仍失败时返回最后一次）
  - `export function applyShift(board, r, c, axis, delta)` → `{ applied, moves: [{fromR,fromC,toR,toC}] }`（同步原 shiftSegment 逻辑，操作传入 board）

- [ ] **Step 1: 写 `game/board.js`**

```js
// 纯棋盘逻辑，无 DOM 依赖。
// 规则：14 行 × 10 列 = 140 格；14 种蔬菜 × 10 个；消除为 0 折直线连通。

export const ROWS = 14;
export const COLS = 10;
export const KINDS = 14;     // 与 svg-icons ICON_NAMES 长度一致
export const PER_KIND = 10;  // 140 / KINDS

// ---- 棋盘构造 ----
export function createBoard(rng = Math.random) {
  let board;
  let attempts = 0;
  do {
    board = buildRandomBoard(rng);
    attempts++;
  } while (!hasAnySolvablePair(board) && attempts < 1000);
  return board; // string[ROWS][COLS]，null 表示空
}

function buildRandomBoard(rng) {
  const pool = [];
  for (let i = 0; i < KINDS; i++)
    for (let j = 0; j < PER_KIND; j++) pool.push(i);
  // Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const board = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(pool[k++]);
    board.push(row);
  }
  return board;
}

// ---- 0 折直线连通 ----
export function isClearPath(board, r1, c1, r2, c2) {
  if (r1 === r2) {
    const [a, b] = c1 < c2 ? [c1, c2] : [c2, c1];
    for (let c = a + 1; c < b; c++) if (board[r1][c] !== null) return false;
    return true;
  }
  if (c1 === c2) {
    const [a, b] = r1 < r2 ? [r1, r2] : [r2, r1];
    for (let r = a + 1; r < b; r++) if (board[r][c1] !== null) return false;
    return true;
  }
  return false;
}

// ---- 从 (r,c) 沿四方向找直线可达的同图案目标 ----
export function findTargets(board, r, c) {
  const v = board[r][c];
  if (v === null || v === undefined) return [];
  const out = [];
  for (let rr = r - 1; rr >= 0; rr--) {
    if (board[rr][c] === v) { out.push({ r: rr, c }); break; }
    if (board[rr][c] !== null) break;
  }
  for (let rr = r + 1; rr < ROWS; rr++) {
    if (board[rr][c] === v) { out.push({ r: rr, c }); break; }
    if (board[rr][c] !== null) break;
  }
  for (let cc = c - 1; cc >= 0; cc--) {
    if (board[r][cc] === v) { out.push({ r, c: cc }); break; }
    if (board[r][cc] !== null) break;
  }
  for (let cc = c + 1; cc < COLS; cc++) {
    if (board[r][cc] === v) { out.push({ r, c: cc }); break; }
    if (board[r][cc] !== null) break;
  }
  return out;
}

export function findSolvablePair(board) {
  const map = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v === null) continue;
      (map[v] = map[v] || []).push([r, c]);
    }
  }
  for (const v in map) {
    const list = map[v];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [r1, c1] = list[i];
        const [r2, c2] = list[j];
        if ((r1 === r2 || c1 === c2) && isClearPath(board, r1, c1, r2, c2)) {
          return { r1, c1, r2, c2 };
        }
      }
    }
  }
  return null;
}

export function hasAnySolvablePair(board) {
  return findSolvablePair(board) !== null;
}

// ---- 重排（就地）----
export function reshuffleInPlace(board, rng = Math.random) {
  const pieces = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] !== null) pieces.push(board[r][c]);
  let attempts = 0;
  do {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    let k = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c] !== null) board[r][c] = pieces[k++];
    attempts++;
  } while (!hasAnySolvablePair(board) && attempts < 1000);
  return board;
}

// ---- 空间平移：拖拽核心 ----
// 语义：以 (r,c) 为受力点沿 axis 推 delta 格，链尾外侧空位决定实际位移
export function applyShift(board, r, c, axis, delta) {
  if (delta === 0) return { applied: 0, moves: [] };
  const NOPE = { applied: 0, moves: [] };

  const doMove = (lo, hi, axisIsRow, dir) => {
    // dir = +1 向索引增大，-1 向索引减小
    // 计算链尾外侧连续空位数
    const len = hi - lo + 1;
    const tailNext = dir > 0 ? hi + 1 : lo - 1;
    const maxR = ROWS - 1, maxC = COLS - 1;
    let cnt = 0;
    if (axisIsRow) {
      let cc = tailNext;
      while (dir > 0 ? cc <= maxC : cc >= 0) {
        if (board[r][cc] !== null) break;
        cnt++; cc += dir;
      }
    } else {
      let rr = tailNext;
      while (dir > 0 ? rr <= maxR : rr >= 0) {
        if (board[rr][c] !== null) break;
        cnt++; rr += dir;
      }
    }
    const shift = Math.min(Math.abs(delta), cnt);
    if (shift <= 0) return NOPE;
    const moves = [];
    const step = dir * shift;
    if (axisIsRow) {
      // 必须从远端开始搬，避免覆盖
      const order = dir > 0 ? [] : [];
      for (let x = dir > 0 ? hi : lo; dir > 0 ? x >= lo : x <= hi; x += dir > 0 ? -1 : 1) {
        moves.push({ fromR: r, fromC: x, toR: r, toC: x + step });
        board[r][x + step] = board[r][x];
        board[r][x] = null;
      }
    } else {
      for (let x = dir > 0 ? hi : lo; dir > 0 ? x >= lo : x <= hi; x += dir > 0 ? -1 : 1) {
        moves.push({ fromR: x, fromC: c, toR: x + step, toC: c });
        board[x + step][c] = board[x][c];
        board[x][c] = null;
      }
    }
    return { applied: shift * dir, moves };
  };

  if (axis === 'row') {
    if (delta > 0) {
      let hi = c;
      while (hi < COLS - 1 && board[r][hi + 1] !== null) hi++;
      return doMove(c, hi, true, +1);
    } else {
      let lo = c;
      while (lo > 0 && board[r][lo - 1] !== null) lo--;
      return doMove(lo, c, true, -1);
    }
  } else { // 'col'
    if (delta > 0) {
      let hi = r;
      while (hi < ROWS - 1 && board[hi + 1][c] !== null) hi++;
      return doMove(c, hi, false, +1);
    } else {
      let lo = r;
      while (lo > 0 && board[lo - 1][c] !== null) lo--;
      return doMove(lo, r, false, -1);
    }
  }
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

export function restoreBoard(board, snap) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      board[r][c] = snap[r][c];
}
```

- [ ] **Step 2: 浏览器控制台单元测试**

`game/main.js` 临时写：
```js
import * as B from './board.js';
const b = B.createBoard();
console.assert(B.ROWS === 14 && B.COLS === 10, 'dimensions');
console.assert(B.hasAnySolvablePair(b), 'createBoard must be solvable');
const t = B.findTargets(b, 0, 0);
console.log('targets from (0,0):', t);
// 测试 applyShift
const b2 = B.cloneBoard(b);
const r = B.applyShift(b2, 0, 0, 'row', 1);
console.log('shift result:', r);
```
刷新页面，控制台无报错，targets 数组非空，shift.moves 数组正确。测后清空 main.js。

- [ ] **Step 3: Commit**

```bash
git add game/board.js
git commit -m "feat: pure board logic module with create/clear/find/reshuffle/shift"
```

---

### Task 5: dialogs.js — 死局 / 游戏结束 / 胜利弹框

**Files:**
- Create (overwrite): `game/dialogs.js`

**Interfaces:**
- Consumes: `index.html` 中已存在的 `<dialog id="winDialog">`、`<dialog id="deadlockDialog">`、`<dialog id="gameOverDialog">`
- Produces:
  - `export function showWin()` → 显示胜利弹框；返回 `{ close: () => void, onRestart: (cb) => void }`
  - `export function showDeadlock()` → 返回 `Promise<'reshuffle' | 'giveup'>`
  - `export function showGameOver(deadlockCount)` → 返回 `Promise<void>`（仅一个按钮，resolve 即放弃）

- [ ] **Step 1: 写 `game/dialogs.js`**

```js
// 弹框管理：基于原生 <dialog>。

const $ = (id) => document.getElementById(id);

export function showWin() {
  const dlg = $('winDialog');
  const card = dlg.querySelector('.dialog__card');
  dlg.showModal();
  const restartBtns = dlg.querySelectorAll('[data-win-restart]');
  const closeBtn = dlg.querySelector('[data-close]');
  const listeners = [];
  const close = () => { if (dlg.open) dlg.close(); };
  restartBtns.forEach(btn => btn.addEventListener('click', () => {
    close();
    listeners.forEach(cb => cb());
  }, { once: true }));
  closeBtn.addEventListener('click', close, { once: true });
  return {
    close,
    onRestart: (cb) => listeners.push(cb),
  };
}

export function showDeadlock() {
  return new Promise((resolve) => {
    const dlg = $('deadlockDialog');
    const reshuffleBtn = dlg.querySelector('[data-deadlock-reshuffle]');
    const giveupBtn = dlg.querySelector('[data-deadlock-giveup]');
    dlg.showModal();
    const onReshuffle = () => { dlg.close(); cleanup(); resolve('reshuffle'); };
    const onGiveup = () => { dlg.close(); cleanup(); resolve('giveup'); };
    const onCancel = (e) => { e.preventDefault(); /* 阻止 Esc 关闭，强制选择 */ };
    const cleanup = () => {
      reshuffleBtn.removeEventListener('click', onReshuffle);
      giveupBtn.removeEventListener('click', onGiveup);
      dlg.removeEventListener('cancel', onCancel);
    };
    reshuffleBtn.addEventListener('click', onReshuffle, { once: true });
    giveupBtn.addEventListener('click', onGiveup, { once: true });
    dlg.addEventListener('cancel', onCancel);
  });
}

export function showGameOver(deadlockCount) {
  return new Promise((resolve) => {
    const dlg = $('gameOverDialog');
    const desc = $('gameOverDesc');
    const restartBtn = dlg.querySelector('[data-gameover-restart]');
    if (desc) desc.textContent = `本局共出现 ${deadlockCount} 次死局`;
    dlg.showModal();
    const onRestart = () => { dlg.close(); restartBtn.removeEventListener('click', onRestart); resolve(); };
    const onCancel = (e) => { e.preventDefault(); };
    restartBtn.addEventListener('click', onRestart);
    dlg.addEventListener('cancel', onCancel);
    setTimeout(() => restartBtn.focus(), 50);
  });
}
```

- [ ] **Step 2: 浏览器手测**

`game/main.js` 临时写：
```js
import { showWin, showDeadlock, showGameOver } from './dialogs.js';
const w = showWin();
w.onRestart(() => console.log('win restart'));
setTimeout(async () => {
  const r = await showDeadlock();
  console.log('deadlock choice:', r);
  await showGameOver(2);
  console.log('gameover dismissed');
}, 2000);
```
刷新页面，依次确认胜利弹框（带 × 关闭）→ 2 秒后死局弹框（两按钮可选）→ 选择后游戏结束弹框（带次数描述）。Esc 应被阻止。测后清空。

- [ ] **Step 3: Commit**

```bash
git add game/dialogs.js
git commit -m "feat: native dialog wrapper for win/deadlock/gameover flows"
```

---

### Task 6: interaction.js — 状态、渲染、点击 + busy 生命周期 + hint 时序（A1, A8）

**Files:**
- Create (overwrite partial): `game/interaction.js`

**Interfaces:**
- Consumes: `board.js`, `svg-icons.js`, `dialogs.js`
- Produces: `export function initGame()` —— 启动游戏主循环，绑定按钮与棋盘事件，内部状态私有

覆盖修复：**A1** busy 真实守卫、**A8** hint 不被自动消除即时吞掉

- [ ] **Step 1: 写 `game/interaction.js`（状态 + 渲染 + 点击 + busy + hint 部分）**

```js
import {
  ROWS, COLS, createBoard, findTargets, findSolvablePair,
  hasAnySolvablePair, reshuffleInPlace, applyShift,
  cloneBoard, restoreBoard,
} from './board.js';
import { ICON_NAMES, ICONS, withFace } from './svg-icons.js';
import { showWin, showDeadlock, showGameOver } from './dialogs.js';

// ---- 内部状态（模块私有）----
const state = {
  board: null,
  cellEls: [],            // DOM 引用 [r][c]
  busy: false,            // 异步窗口期间为 true，阻塞所有输入
  mode: 'idle',           // 'idle' | 'selected' | 'waiting'
  anchor: null,           // { r, c, el }
  candidates: [],         // [{ r, c, el }]
  pendingRevert: null,    // 多目标 waiting 期间保留的回滚快照 { snapshot, revertMoves }
  pitch: 35,              // 当前单元格中心距，由 measurePitch() 维护
  round: 1,
  deadlockCount: 0,
  drag: null,
  hintTimer: null,
};

const DRAG_THRESHOLD = 10;

const boardEl = () => document.getElementById('board');
const tipEl = () => document.getElementById('tip');
const roundEl = () => document.getElementById('round');

// ---- busy 生命周期（A1）----
function setBusy(v) { state.busy = v; }

// ---- 单元格 pitch 测量（A6）----
function measurePitch() {
  const cells = boardEl().querySelectorAll('.cell');
  if (cells.length < 2) return state.pitch;
  const a = cells[0].getBoundingClientRect();
  const b = cells[1].getBoundingClientRect();
  // 同行第二格：横向间距；若不相邻（换行）则取纵向
  if (Math.abs(a.top - b.top) < 2) {
    state.pitch = Math.round(b.left - a.left);
  } else {
    // 取单格宽 + gap，用 CSS 变量读
    const cssPitch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pitch'));
    if (!Number.isNaN(cssPitch) && cssPitch > 0) state.pitch = cssPitch;
  }
}
window.addEventListener('resize', () => {
  clearTimeout(window.__pitchTimer);
  window.__pitchTimer = setTimeout(measurePitch, 150);
});

// ---- 渲染 ----
function renderBoard() {
  const el = boardEl();
  el.innerHTML = '';
  state.cellEls = [];
  for (let r = 0; r < ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      const v = state.board[r][c];
      if (v === null) {
        cell.classList.add('empty');
      } else {
        cell.innerHTML = ICONS[ICON_NAMES[v]];
      }
      el.appendChild(cell);
      rowArr.push(cell);
    }
    state.cellEls.push(rowArr);
  }
  cancelSelection();
  requestAnimationFrame(measurePitch);
}

// 同步 DOM 文本与 empty 类，不重建监听
function syncDOM() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = state.cellEls[r][c];
      const v = state.board[r][c];
      if (v === null) {
        if (!el.classList.contains('empty')) {
          el.classList.add('empty');
          el.innerHTML = '';
        }
      } else {
        if (el.classList.contains('empty')) el.classList.remove('empty');
        const want = ICONS[ICON_NAMES[v]];
        if (el.dataset.rendered !== ICON_NAMES[v]) {
          el.innerHTML = want;
          el.dataset.rendered = ICON_NAMES[v];
        }
      }
    }
  }
}

// ---- 点击交互 ----
function onCellClick(r, c) {
  if (state.busy) return;
  if (state.board[r][c] === null) return;
  clearTip();

  // waiting 状态：点候选 → 消除（清 pendingRevert）
  if (state.mode === 'waiting' && state.candidates.some(p => p.r === r && p.c === c)) {
    commitPendingAndEliminate(r, c);
    return;
  }
  // waiting 状态：点非候选 → 先回滚推动（A3），再处理新选择
  if (state.mode === 'waiting' && state.pendingRevert) {
    rollbackPending();
  }
  // 点 anchor 自身 → 取消
  if (state.mode !== 'idle' && state.anchor && state.anchor.r === r && state.anchor.c === c) {
    cancelSelection();
    return;
  }
  cancelSelection();
  selectAndEvaluate(r, c);
}

function selectAndEvaluate(r, c) {
  const el = state.cellEls[r][c];
  const targets = findTargets(state.board, r, c);
  if (targets.length === 1) {
    // 单目标：等待 hint 学习窗口后再消除（A8 协同）
    const t = targets[0];
    el.classList.add('selected');
    state.anchor = { r, c, el };
    state.mode = 'selected';
    setTimeout(() => {
      if (state.anchor && state.anchor.r === r && state.anchor.c === c) {
        eliminate({ r, c, el }, { r: t.r, c: t.c, el: state.cellEls[t.r][t.c] });
      }
    }, 220);
  } else if (targets.length >= 2) {
    state.mode = 'waiting';
    state.anchor = { r, c, el };
    el.classList.add('selected');
    state.candidates = targets.map(t => ({ r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }));
    state.candidates.forEach(p => p.el.classList.add('hint'));
  } else {
    shakeSameEmoji(state.board[r][c]);
  }
}

function commitPendingAndEliminate(r, c) {
  state.pendingRevert = null; // 提交，不再回滚
  eliminate(state.anchor, { r, c, el: state.cellEls[r][c] });
}

function rollbackPending() {
  if (!state.pendingRevert) return;
  const { snapshot, revertMoves } = state.pendingRevert;
  restoreBoard(state.board, snapshot);
  syncDOM();
  animateMoves(revertMoves, 180);
  state.pendingRevert = null;
}

function eliminate(a, b) {
  state.board[a.r][a.c] = null;
  state.board[b.r][b.c] = null;
  // 短暂震惊脸再消失（A8 表情动画）
  [a, b].forEach(p => {
    const svg = p.el.querySelector('svg.veg');
    if (svg) p.el.innerHTML = withFace(svg.outerHTML, 'shock');
  });
  setTimeout(() => {
    [a, b].forEach(p => {
      p.el.classList.remove('selected', 'hint');
      p.el.classList.add('empty');
      p.el.innerHTML = '';
      delete p.el.dataset.rendered;
    });
  }, 180);
  cancelSelection();
  afterEliminate();
}

function cancelSelection() {
  if (state.anchor) state.anchor.el.classList.remove('selected');
  state.candidates.forEach(p => p.el.classList.remove('hint'));
  state.anchor = null;
  state.candidates = [];
  state.mode = 'idle';
}

function shakeSameEmoji(v) {
  const targets = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] === v) targets.push(state.cellEls[r][c]);
  if (!targets.length) return;
  targets.forEach(el => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  });
  setTimeout(() => targets.forEach(el => el.classList.remove('shake')), 580);
}

// ---- hint（A8）----
function hint() {
  if (state.busy) return;
  clearTip();
  const pair = findSolvablePair(state.board);
  if (!pair) {
    showTip('当前盘面无可消除对');
    return;
  }
  const e1 = state.cellEls[pair.r1][pair.c1];
  const e2 = state.cellEls[pair.r2][pair.c2];
  e1.classList.add('hint');
  e2.classList.add('hint');
  clearTimeout(state.hintTimer);
  state.hintTimer = setTimeout(() => {
    e1.classList.remove('hint');
    e2.classList.remove('hint');
  }, 2000);
}

// ---- afterEliminate：胜利 / 死局 ----
function afterEliminate() {
  if (isAllCleared()) {
    setBusy(true);
    const w = showWin();
    w.onRestart(() => { restart(); });
    return;
  }
  if (!hasAnySolvablePair(state.board)) {
    handleDeadlock();
  }
}

function isAllCleared() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] !== null) return false;
  return true;
}

// ---- 死局处理（A2 + 状态机）----
async function handleDeadlock() {
  setBusy(true);
  if (state.deadlockCount === 0) {
    const choice = await showDeadlock();
    if (choice === 'reshuffle') {
      state.deadlockCount++;
      reshuffleInPlace(state.board);
      renderBoard();
      showTip('已重排，继续加油');
      setBusy(false);
    } else {
      restart();
    }
  } else {
    await showGameOver(state.deadlockCount + 1);
    restart();
  }
}

// ---- 重开 ----
function restart() {
  state.board = createBoard();
  state.deadlockCount = 0;
  state.round++;
  if (roundEl()) roundEl().textContent = String(state.round);
  state.pendingRevert = null;
  cancelSelection();
  renderBoard();
  setBusy(false);
}

// ---- 提示文字 ----
let tipTimer = null;
function showTip(msg) {
  const el = tipEl();
  if (!el) return;
  el.textContent = msg;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { el.textContent = ''; }, 2500);
}
function clearTip() {
  if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; }
  const el = tipEl();
  if (el) el.textContent = '';
}

// ---- 拖拽（占位，Task 7 实现）----
function onPointerDown(e) { /* Task 7 */ }
function onPointerMove(e) { /* Task 7 */ }
function onPointerUp(e)   { /* Task 7 */ }

// ---- 动画（占位，Task 8 实现）----
function animateMoves(moves, duration) { /* Task 8 */ }

// ---- 启动 ----
export function initGame() {
  state.board = createBoard();
  renderBoard();

  document.getElementById('hintBtn').addEventListener('click', hint);
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (state.busy) return;
    reshuffleInPlace(state.board);
    renderBoard();
    showTip('已重新洗牌');
  });
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (state.busy) return;
    restart();
  });

  // 棋盘事件代理
  const be = boardEl();
  be.addEventListener('mousedown', onPointerDown);
  be.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', onPointerUp);
}
```

- [ ] **Step 2: 浏览器手测**

`game/main.js` 写 `import { initGame } from './interaction.js'; initGame();`

刷新页面，验证：
- 棋盘渲染 14 个不同蔬菜 SVG，无 emoji
- 点击单目标方块 220ms 后自动消除（带震惊脸）
- 点击多目标 → waiting，候选高亮
- waiting 时点候选 → 消除；点空白 → 暂无反应（rollback Task 7 接，这里直接走"取消选中再评估"分支，因 pendingRevert 还未设置）
- 提示按钮高亮一对 2s
- 死局（手动构造：把所有同色打散到不可消除位置后点重排直到死局）—— 暂不易触发，Task 10 联调时验

- [ ] **Step 3: Commit**

```bash
git add game/interaction.js
git commit -m "feat: interaction state, render, click logic with busy lifecycle and hint timing"
```

---

### Task 7: interaction.js — 拖拽 + shift + 多目标回滚（A3, A4, A5）

**Files:**
- Modify: `game/interaction.js`（替换 Task 6 中 `onPointerDown/Move/Up` 占位函数）

覆盖修复：**A3** waiting 期间保留 pendingRevert、**A4** 边界阻挡不再跳跃、**A5** touchmove 立即 preventDefault

- [ ] **Step 1: 替换 onPointerDown / onPointerMove / onPointerUp 占位实现**

把 Task 6 中的占位 3 个函数替换为：

```js
function pointerXY(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function cellFromTarget(t) {
  const el = t.closest && t.closest('.cell');
  if (!el || el.classList.contains('empty')) return null;
  return { r: +el.dataset.r, c: +el.dataset.c, el };
}

// A5：touchstart 即标记 drag，touchmove 始终 preventDefault
function onPointerDown(e) {
  if (state.busy) return;
  const cell = cellFromTarget(e.target);
  if (!cell) return;
  // 若有未决推动（多目标 waiting），先回滚再 snapshot，避免 snapshot 错位
  if (state.pendingRevert) rollbackPending();
  const { x, y } = pointerXY(e);
  state.drag = {
    r: cell.r, c: cell.c,
    startX: x, startY: y,
    axis: null,
    lastShift: 0,
    moved: false,
    curR: cell.r, curC: cell.c,
    snapshot: cloneBoard(state.board),
    history: [],
    blockedHintAt: 0,
  };
}

function onPointerMove(e) {
  if (!state.drag) return;
  // A5：drag 进行中始终阻止默认（防页面滚动）
  if (e.cancelable) e.preventDefault();
  const { x, y } = pointerXY(e);
  const dx = x - state.drag.startX;
  const dy = y - state.drag.startY;
  if (!state.drag.axis) {
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      state.drag.axis = Math.abs(dx) > Math.abs(dy) ? 'row' : 'col';
      cancelSelection();
      if (state.pendingRevert) rollbackPending();
    } else return;
  }
  const want = Math.round((state.drag.axis === 'row' ? dx : dy) / state.pitch);
  if (want === state.drag.lastShift) return;
  const delta = want - state.drag.lastShift;
  const result = applyShift(state.board, state.drag.curR, state.drag.curC, state.drag.axis, delta);
  if (result.applied !== 0) {
    state.drag.lastShift += result.applied;
    if (state.drag.axis === 'row') state.drag.curC += result.applied;
    else state.drag.curR += result.applied;
    state.drag.moved = true;
    state.drag.history.push(...result.moves);
    syncDOM();
    animateMoves(result.moves, 110);
  } else {
    // A4：边界阻挡，lastShift 保持不变；触觉反馈，但不跳跃
    const now = Date.now();
    if (now - state.drag.blockedHintAt > 200) {
      state.drag.blockedHintAt = now;
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }
}

function onPointerUp(e) {
  if (!state.drag) return;
  const wasDrag = state.drag.moved;
  const info = {
    r: state.drag.r, c: state.drag.c,
    curR: state.drag.curR, curC: state.drag.curC,
    snapshot: state.drag.snapshot,
    history: state.drag.history,
  };
  state.drag = null;

  if (!wasDrag) {
    onCellClick(info.r, info.c);
    return;
  }

  const targets = findTargets(state.board, info.curR, info.curC);
  if (targets.length === 0) {
    const revertMoves = info.history.map(m => ({
      fromR: m.toR, fromC: m.toC, toR: m.fromR, toC: m.fromC,
    }));
    restoreBoard(state.board, info.snapshot);
    syncDOM();
    animateMoves(revertMoves, 200);
    showTip('无可消除，已还原');
    return;
  }

  if (targets.length === 1) {
    const t = targets[0];
    eliminate(
      { r: info.curR, c: info.curC, el: state.cellEls[info.curR][info.curC] },
      { r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }
    );
  } else {
    // A3：多目标 → 进入 waiting，保留 pendingRevert 以便玩家取消时回滚
    state.mode = 'waiting';
    const el = state.cellEls[info.curR][info.curC];
    state.anchor = { r: info.curR, c: info.curC, el };
    el.classList.add('selected');
    state.candidates = targets.map(t => ({ r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }));
    state.candidates.forEach(p => p.el.classList.add('hint'));
    state.pendingRevert = {
      snapshot: info.snapshot,
      revertMoves: info.history.map(m => ({
        fromR: m.toR, fromC: m.toC, toR: m.fromR, toC: m.fromC,
      })),
    };
    showTip('多目标，请点击要消除的方块（点空白取消并还原）');
  }
}
```

- [ ] **Step 2: 浏览器手测**

- 拖动方块向同色方向推动整列
- 拖到边界被阻：手指继续多滑一格不再被吞（A4 验证）
- 拖动到无可消除 → 自动回滚动画
- 拖动到多目标 → waiting + 提示，**此时点棋盘空白或非候选方块** → 触发回滚动画，盘面还原（A3 验证）
- 拖动到多目标 → 点候选 → 消除，无回滚
- 拖动中页面不滚动（A5 验证）

- [ ] **Step 3: Commit**

```bash
git add game/interaction.js
git commit -m "feat: drag-shift with multi-target rollback, boundary feedback, preventDefault fix"
```

---

### Task 8: interaction.js — 动画 + pitch 动态测量（A6）

**Files:**
- Modify: `game/interaction.js`（替换 `animateMoves` 占位）

覆盖修复：**A6** 用 state.pitch 替代硬编码

- [ ] **Step 1: 替换 animateMoves 实现**

```js
function animateMoves(moves, duration) {
  if (!moves.length) return;
  // 用 state.pitch 计算 dx/dy（A6）
  moves.forEach(m => {
    const el = state.cellEls[m.toR] && state.cellEls[m.toR][m.toC];
    if (!el) return;
    const dx = (m.fromC - m.toC) * state.pitch;
    const dy = (m.fromR - m.toR) * state.pitch;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const first = state.cellEls[moves[0].toR][moves[0].toC];
  void first.offsetWidth;
  requestAnimationFrame(() => {
    moves.forEach(m => {
      const el = state.cellEls[m.toR] && state.cellEls[m.toR][m.toC];
      if (el) {
        el.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        el.style.transform = '';
      }
    });
  });
  setTimeout(() => {
    moves.forEach(m => {
      const el = state.cellEls[m.toR] && state.cellEls[m.toR][m.toC];
      if (el) { el.style.transition = ''; el.style.transform = ''; }
    });
  }, duration + 30);
}
```

- [ ] **Step 2: 浏览器手测**

- DevTools 切到 375px / 768px / 1440px 三档，每档刷新页面后拖动一次
- 动画位移准确（无错位、无 overshoot）
- 改窗口大小后再拖动，位移仍准确（resize 监听已生效）

- [ ] **Step 3: Commit**

```bash
git add game/interaction.js
git commit -m "feat: pitch-aware FLIP animation replacing hardcoded CELL_PX"
```

---

### Task 9: 验证 A7（胜利 overlay 关闭）+ A8（hint 学习窗口）

**Files:**
- 无新文件；纯手测验证 Task 5/6 已实现的特性

- [ ] **Step 1: A7 验证**

启动游戏，构造胜利（可临时把 ROWS/COLS 改小或用 console 注入 `state.board = [[null,...]]` 模拟）：
```js
// 浏览器控制台
import('./game/interaction.js'); // 触发模块加载（main.js 已加载则无需）
// 通过大量手动消除走到胜利，或：
// 临时在 main.js 末尾加：setTimeout(() => { for(let r=0;r<14;r++) for(let c=0;c<10;c++) state.board[r][c]=null; renderBoard(); afterEliminate(); }, 1000);
```

验证：
- 胜利弹框右上角 × 按钮可关闭
- 关闭后弹框消失，棋盘可见（终局空盘）
- 点击"再来一局" → 重开，弹框关闭

- [ ] **Step 2: A8 验证**

- 盘面构造单目标 pair：点击其中一个 → 看到 selected 高亮 + 220ms 后自动消除（学习窗口生效）
- 点击 hint 按钮 → 高亮 2 秒；期间用鼠标点其它方块 → 高亮立即消失
- 多目标场景下点 hint → 高亮但不自动消除

- [ ] **Step 3: 如果发现遗漏，补丁；否则跳过 commit**

如需补丁，提交：
```bash
git add -A
git commit -m "fix: A7 win overlay close + A8 hint learning window verification"
```

---

### Task 10: 端到端死局流程联调

**Files:**
- 无新文件；可能微调 `interaction.js` 的 `handleDeadlock`

- [ ] **Step 1: 构造死局（开发用 hook）**

临时在 `game/interaction.js` 暴露一个开发接口（最终提交前移除或保留为隐藏 API）：
```js
// 仅用于调试：强制进入死局
window.__forceDeadlock = function() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      state.board[r][c] = (r * 10 + c) % 14; // 每格不同，保证 0 折不可消
  // 留两个相邻同色制造"有解"假象？不，要的就是真死局
  // 重新洗成不可解：
  let tries = 0;
  while (hasAnySolvablePair(state.board) && tries < 50) {
    // 把所有同色拆开到不同行不同列
    reshuffleInPlace(state.board);
    tries++;
  }
  renderBoard();
  afterEliminate();
};
```

- [ ] **Step 2: 浏览器控制台调用 `__forceDeadlock()`**

验证：
1. **首次死局** → 弹框"😵 陷入死局"两按钮
2. 点 `🔀 重排一次` → 弹框关闭，盘面重排可解，提示"已重排"，可继续玩
3. 再次 `__forceDeadlock()` → 弹框"💔 游戏结束"显示 `本局共出现 2 次死局`
4. 点 `🏳️ 放弃本局并重开` → 完全重置，deadlockCount 归零，round +1
5. Esc 无法关闭弹框（强制选择）

- [ ] **Step 3: 移除调试 hook，提交**

把 `window.__forceDeadlock` 删除（或保留为 `if (location.search.includes('debug'))` 守卫）。
```bash
git add game/interaction.js
git commit -m "test: verified deadlock state machine end-to-end"
```

---

### Task 11: main.js — 启动入口 + 字体后备 + reduced-motion 全局

**Files:**
- Modify (overwrite placeholder): `game/main.js`

- [ ] **Step 1: 写 `game/main.js`**

```js
import { initGame } from './interaction.js';

// 等待 DOM 就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

// 字体加载完成后重测 pitch（字体回流后单元格位置可能微调）
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
}

// reduced-motion 全局提示（CSS 已处理动画降级；JS 侧仅日志）
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  console.info('[a11y] reduced-motion 已启用，动画已降级');
}
```

- [ ] **Step 2: 完整端到端冒烟**

```bash
node /home/ubuntu/pj_bricks/server.js &
```
浏览器打开 `http://localhost:3013/`，DevTools 无报错，依次：
1. 蔬菜全部漫画 SVG 渲染
2. 玩到自然胜利（或用 `__forceDeadlock` 验各弹框）
3. 拖拽、点击、提示、重排、重开各按钮均工作
4. 切 375/768/1440 三档视口无溢出
5. 系统设置开"减少动态效果"，所有动画降级为瞬切

- [ ] **Step 3: Commit**

```bash
git add game/main.js
git commit -m "feat: main entry with DOM-ready init and font reflow handling"
```

---

### Task 12: 最终验收清单

**Files:**
- 无；按 spec §7 全表跑一遍

- [ ] **Step 1: 功能验证**

- [ ] 开局必可解（连点 20 次"🔄 重开"，每次都能找到可消对）
- [ ] 单目标点击 → 220ms 学习窗口 → 自动消除
- [ ] 多目标进入 waiting，点候选消除
- [ ] 多目标 waiting 时点空白 → 回滚推动（A3）
- [ ] 拖动多格连锁正确
- [ ] 拖到边界被阻，继续向同方向拖可再次尝试（A4）
- [ ] 拖动到无可消除 → 回滚动画
- [ ] 死局首次 → 弹框两按钮（重排 → deadlockCount=1）
- [ ] 死局二次 → 游戏结束弹框
- [ ] 放弃本局 → 完全重置
- [ ] 胜利弹框 × 可关闭，再来一局工作（A7）
- [ ] hint 高亮 2s，新输入立即取消（A8）

- [ ] **Step 2: 视觉验证**

- [ ] 14 个蔬菜盲测 10 次能秒认
- [ ] 竖版 14×10 在 375 / 768 / 1440 不溢出
- [ ] 按压 scale 0.94 spring，reduced-motion 下降级
- [ ] 弹框 backdrop blur + scale 入场
- [ ] 选中态眯眼笑、消除瞬间惊讶嘴

- [ ] **Step 3: 工程验证**

- [ ] `curl -sI http://localhost:3013/` → 200
- [ ] `curl -sI http://localhost:3013/styles.css` → 200 text/css
- [ ] `curl -sI http://localhost:3013/game/main.js` → 200 application/javascript
- [ ] `curl -sI http://localhost:3013/game/../server.js` → 403/400
- [ ] DevTools Console 无报错
- [ ] DevTools Network 显示所有模块 200
- [ ] 拖拽时 CLS ≈ 0（Performance 面板录制 1s）

- [ ] **Step 4: 提交收尾**

```bash
git add -A
git commit -m "chore: final verification of redesign against spec checklist"
git log --oneline | head -15
```

---

## 验收后

实施完成后调用 `superpowers:requesting-code-review` 跑一轮自审，再交付给用户。
