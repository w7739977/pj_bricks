// 构建图标选图页 icon-picker.html（开发期工具，产物为纯静态页，由 server.js 直接伺服）
// 用法：node tools/build-icon-picker.mjs
// 数据源：OpenMoji（CC BY-SA 4.0）与 Twemoji（CC BY 4.0）官方/CDN SVG，构建期内联，运行时零外部请求
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { ICON_NAMES, ICON_LABELS } from '../game/svg-icons.js';

// 蔬果 → Unicode emoji 码点
const EMOJI = {
  broccoli: '1f966', lettuce: '1f96c', tomato: '1f345', carrot: '1f955', corn: '1f33d',
  eggplant: '1f346', onion: '1f9c5', potato: '1f954', cucumber: '1f952', pepper: '1fad1',
  pumpkin: '1f383', grape: '1f347', apple: '1f34e', strawberry: '1f353',
  banana: '1f34c', orange: '1f34a', pear: '1f350', cherry: '1f352', peach: '1f351', watermelon: '1f349',
};

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const sanitize = svg =>
  svg.replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(width|height)="[^"]*"/g, '');

// Kenney Food Kit（CC0）：64×64 PNG 精灵，base64 内联。
// 包内缺 potato / cucumber / peach，用最近似项占位并标注。
const KENNEY_MAP = {
  broccoli: 'broccoli', lettuce: 'cabbage', tomato: 'tomato', carrot: 'carrot', corn: 'corn',
  eggplant: 'eggplant', onion: 'onion', potato: 'beet', cucumber: 'celery-stick', pepper: 'paprika',
  pumpkin: 'pumpkin', grape: 'grapes', apple: 'apple', strawberry: 'strawberry',
  banana: 'banana', orange: 'orange', pear: 'pear', cherry: 'cherries', peach: 'advocado',
  watermelon: 'watermelon',
};
const KENNEY_MISSING = new Set(['potato', 'cucumber', 'peach']);
const KENNEY_DIR = '/tmp/kenney_fk/Previews';
const kenney = {};
for (const name of ICON_NAMES) {
  const f = `${KENNEY_DIR}/${KENNEY_MAP[name]}.png`;
  try {
    const b64 = readFileSync(f).toString('base64');
    kenney[name] = `<img src="data:image/png;base64,${b64}" alt="${name}" style="width:56px;height:56px;image-rendering:auto">`;
  } catch {
    kenney[name] = `<span style="font-size:11px;opacity:.6">缺</span>`;
  }
}

// Noto Emoji（Google, Apache-2.0/OFL）与 Fluent Emoji Flat（Microsoft, MIT）：
// 经 Iconify API 拉取彩色/扁平 2D 矢量，构建期内联
const NOTO_MAP = {
  broccoli: ['broccoli'], lettuce: ['leafy-green'], tomato: ['tomato'], carrot: ['carrot'],
  corn: ['ears-of-corn', 'ear-of-corn', 'corn'], eggplant: ['eggplant'], onion: ['onion'], potato: ['potato'],
  cucumber: ['cucumber'], pepper: ['bell-pepper', 'bell', 'hot-pepper'],
  pumpkin: ['jack-o-lantern', 'pumpkin'], grape: ['grapes'], apple: ['red-apple'],
  strawberry: ['strawberry'], banana: ['banana'], orange: ['tangerine'], pear: ['pear'],
  cherry: ['cherries'], peach: ['peach'], watermelon: ['watermelon'],
};
const FLAT_MAP = {
  broccoli: ['broccoli'], lettuce: ['leafy-green'], tomato: ['tomato'], carrot: ['carrot'],
  corn: ['ears-of-corn', 'ear-of-corn', 'corn'], eggplant: ['eggplant'], onion: ['onion'], potato: ['potato'],
  cucumber: ['cucumber'], pepper: ['bell-pepper', 'bell-pepper-red', 'pepper'],
  pumpkin: ['jack-o-lantern', 'pumpkin'], grape: ['grapes'], apple: ['red-apple'],
  strawberry: ['strawberry'], banana: ['banana'], orange: ['tangerine'], pear: ['pear'],
  cherry: ['cherries'], peach: ['peach'], watermelon: ['watermelon'],
};
async function iconify(prefix, names) {
  for (const n of names) {
    const res = await fetch(`https://api.iconify.design/${prefix}/${n}.svg`);
    if (res.ok) {
      const t = await res.text();
      if (!t.includes('svg')) continue;
      return sanitize(t).replace(/(width|height)="[^"]*"/g, '');
    }
  }
  return null;
}
const noto = {}, flat = {};
for (const name of ICON_NAMES) {
  noto[name] = await iconify('noto', NOTO_MAP[name]);
  flat[name] = await iconify('fluent-emoji-flat', FLAT_MAP[name]);
  process.stdout.write(`  ${name} noto=${!!noto[name]} flat=${!!flat[name]}\n`);
}

console.log('拉取 OpenMoji / Twemoji SVG…');
const openmoji = {}, twemoji = {};
for (const name of ICON_NAMES) {
  const cp = EMOJI[name];
  openmoji[name] = sanitize(await fetchText(`https://openmoji.org/data/color/svg/${cp.toUpperCase()}.svg`));
  twemoji[name] = sanitize(await fetchText(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp}.svg`));
  process.stdout.write(`  ${name} ok\n`);
}

// 现版自绘图标：直接复用游戏模块（浏览器端动态 import）
const rows = ICON_NAMES.map(name => `
      <section class="row" data-name="${name}">
        <h2>${ICON_LABELS[name]} <small>${name}</small></h2>
        <div class="opts">
          <button class="opt" data-src="current" aria-pressed="false">
            <span class="cell-tile" data-current="${name}"></span><span class="tag">现版</span>
          </button>
          <button class="opt" data-src="openmoji" aria-pressed="false">
            <span class="cell-tile">${openmoji[name]}</span><span class="tag">OpenMoji</span>
          </button>
          <button class="opt" data-src="twemoji" aria-pressed="false">
            <span class="cell-tile">${twemoji[name]}</span><span class="tag">Twemoji</span>
          </button>
          <button class="opt" data-src="noto" aria-pressed="false">
            <span class="cell-tile">${noto[name] ?? '<span style="font-size:11px;opacity:.6">缺</span>'}</span><span class="tag">Noto</span>
          </button>
          <button class="opt" data-src="fluent" aria-pressed="false">
            <span class="cell-tile">${flat[name] ?? '<span style="font-size:11px;opacity:.6">缺</span>'}</span><span class="tag">Fluent</span>
          </button>
          <button class="opt" data-src="kenney" aria-pressed="false">
            <span class="cell-tile">${kenney[name]}${KENNEY_MISSING.has(name) ? '<small style="position:absolute;margin-top:-14px;margin-left:44px;background:#FF4F9A;color:#fff;border-radius:6px;padding:0 4px;font-size:10px">近似</small>' : ''}</span><span class="tag">Kenney</span>
          </button>
        </div>
      </section>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>连连看 · 棋子图标选图页</title>
<style>
  :root {
    --pasture: #7EC850; --pasture-deep: #5FA83A; --tile: #FFF8C9; --ink: #3D2314;
    --pick: #FF4F9A;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 96px;
    font-family: system-ui, sans-serif; color: var(--ink);
    background: repeating-linear-gradient(135deg, var(--pasture) 0 26px, var(--pasture-deep) 26px 52px);
  }
  header { max-width: 760px; margin: 0 auto 20px; background: var(--tile); border-radius: 14px; padding: 14px 18px; }
  h1 { margin: 0 0 6px; font-size: 20px; }
  header p { margin: 0; font-size: 14px; line-height: 1.6; }
  main { max-width: 760px; margin: 0 auto; display: grid; gap: 12px; }
  .row { background: var(--tile); border-radius: 14px; padding: 12px 16px; }
  .row h2 { margin: 0 0 8px; font-size: 16px; }
  .row h2 small { font-weight: 400; opacity: .55; font-size: 12px; margin-left: 6px; }
  .opts { display: flex; gap: 10px; flex-wrap: wrap; }
  .opt {
    position: relative;
    display: grid; justify-items: center; gap: 4px; padding: 8px;
    background: transparent; border: 3px solid transparent; border-radius: 12px;
    cursor: pointer; min-width: 96px; touch-action: manipulation;
  }
  .opt:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
  .opt[aria-pressed="true"] { border-color: var(--pick); background: #FFE9F2; }
  .cell-tile {
    width: 64px; height: 64px; background: #fff; border-radius: 10px;
    display: grid; place-items: center; overflow: hidden;
    box-shadow: inset 0 -3px 0 rgba(61,35,20,.18);
  }
  .cell-tile svg { width: 56px; height: 56px; }
  .tag { font-size: 12px; }
  .bar {
    position: fixed; inset: auto 0 0 0; background: #000d; color: #fff;
    display: flex; gap: 12px; align-items: center; justify-content: center;
    padding: 12px 16px; flex-wrap: wrap;
  }
  .bar output { font-size: 13px; }
  .bar button {
    padding: 10px 18px; border-radius: 10px; border: 0; cursor: pointer;
    font-size: 14px; font-weight: 600; touch-action: manipulation;
  }
  #export { background: var(--pick); color: #fff; }
  #all { background: #fff; color: var(--ink); }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>
</head>
<body>
<header>
  <h1>棋子图标候选对比</h1>
  <p>每种蔬菜一行：现版自绘 / OpenMoji（CC BY-SA 4.0）/ Twemoji（CC BY 4.0）/ Noto 彩色（Apache-2.0）/ Fluent 扁平（MIT）/ Kenney Food Kit（CC0，土豆/黄瓜/桃子为最近似占位）。
     点击卡片圈选；导出按钮会把选择结果复制到剪贴板，发给我即可替换进游戏。</p>
</header>
<main>
${rows}
</main>
<div class="bar">
  <button id="all" type="button">整站全选 OpenMoji</button>
  <button id="all2" type="button">整站全选 Twemoji</button>
  <button id="export" type="button">导出我的选择</button>
  <output id="count">已选 0 / ${ICON_NAMES.length}</output>
</div>
<script>
  const names = ${JSON.stringify(ICON_NAMES)};
  const saved = JSON.parse(localStorage.getItem('icon-pick') || '{}');
  const buttons = [...document.querySelectorAll('.opt')];

  function render() {
    let picked = 0;
    for (const b of buttons) {
      const row = b.closest('.row');
      const on = saved[row.dataset.name] === b.dataset.src;
      b.setAttribute('aria-pressed', on);
      if (on) picked++;
    }
    document.getElementById('count').textContent = '已选 ' + picked + ' / ' + names.length;
  }
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const row = b.closest('.row');
      if (saved[row.dataset.name] === b.dataset.src) delete saved[row.dataset.name];
      else saved[row.dataset.name] = b.dataset.src;
      localStorage.setItem('icon-pick', JSON.stringify(saved));
      render();
    });
  }
  function pickAll(src) {
    for (const n of names) saved[n] = src;
    localStorage.setItem('icon-pick', JSON.stringify(saved));
    render();
  }
  document.getElementById('all').addEventListener('click', () => pickAll('openmoji'));
  document.getElementById('all2').addEventListener('click', () => pickAll('twemoji'));
  document.getElementById('export').addEventListener('click', async () => {
    const text = JSON.stringify(saved, null, 2);
    try { await navigator.clipboard.writeText(text); alert('已复制到剪贴板，直接粘贴给我'); }
    catch { prompt('复制以下内容发给我', text); }
  });
  render();
</script>
</body>
</html>
`;

mkdirSync('tools', { recursive: true });
writeFileSync('icon-picker.html', html);
console.log('已生成 icon-picker.html (' + Math.round(html.length / 1024) + ' KB)');
