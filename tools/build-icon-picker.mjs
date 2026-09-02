// 构建图标选图页 icon-picker.html（开发期工具，产物为纯静态页，由 server.js 直接伺服）
// 用法：node tools/build-icon-picker.mjs
// 数据源：OpenMoji（CC BY-SA 4.0）与 Twemoji（CC BY 4.0）官方/CDN SVG，构建期内联，运行时零外部请求
import { writeFileSync, mkdirSync } from 'node:fs';
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
  <p>每种蔬菜一行：现版自绘 / OpenMoji（CC BY-SA 4.0）/ Twemoji（CC BY 4.0）。
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
