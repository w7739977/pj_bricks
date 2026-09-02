// 将 OpenMoji 彩色 SVG（CC BY-SA 4.0）接入游戏图标。
// 用法：node tools/apply-openmoji.mjs
// 产出：game/openmoji-bodies.mjs（内联 path 数据）+ 重写 game/svg-icons.js 的贴图来源。
// 结构保持不变：ICONS/ICON_NAMES/ICON_LABELS/withFace/FACE_LAYERS 对 interaction.js 的契约不变。
import { writeFileSync } from 'node:fs';
import { ICON_NAMES, ICON_LABELS } from '../game/svg-icons.js';

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

const innerOf = svg => {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!m) throw new Error('no svg root');
  return m[1].trim();
};

console.log('拉取 OpenMoji…');
const bodies = {};
for (const name of ICON_NAMES) {
  const svg = sanitize(await fetchText(`https://openmoji.org/data/color/svg/${EMOJI[name].toUpperCase()}.svg`));
  // OpenMoji 画布 72×72，游戏 viewBox 64×64：平移 -4 居中
  bodies[name] = `<g transform="translate(-4,-4)">\n${innerOf(svg)}\n</g>`;
  process.stdout.write(`  ${name} ok\n`);
}

writeFileSync('game/openmoji-bodies.mjs',
  `// OpenMoji 彩色图标数据（CC BY-SA 4.0，来源 https://openmoji.org）。\n` +
  `// 由 tools/apply-openmoji.mjs 生成，勿手改；72×72 原始画布已平移居中到 64×64。\n\n` +
  `export const OPENMOJI_BODIES = {\n` +
  ICON_NAMES.map(n => `  ${n}: \`\n${bodies[n]}\`,`).join('\n') +
  `\n};\n`);
console.log('已生成 game/openmoji-bodies.mjs');

// ---- 重写 svg-icons.js：贴图源换成 OpenMoji，其余契约不动 ----
const iconEntries = ICON_NAMES.map(n => `  ${n}: S("${n}", BODIES.${n}),`).join('\n\n');
const next = `// 棋子图标：贴图采用 OpenMoji（CC BY-SA 4.0，https://openmoji.org），
// 由 tools/apply-openmoji.mjs 构建期内联（运行时零外部请求）。
// 表情层（消除特效的震惊/开心脸）仍为项目自绘，叠加在贴图之上。
// 顺序对应 board.js 中的图案编号。

import { OPENMOJI_BODIES } from './openmoji-bodies.mjs';

const INK = '#3D2B1F';
// 预置表情层：默认隐藏，由 CSS 按容器 svg 的 face-* 类点亮。
// 消除特效只切换 class，避免每次序列化/重建 SVG 字符串。
const FACE_LAYERS = \`<g class="face face--happy">
  <path d="M22 36q4-4 8 0M34 36q4-4 8 0M27 43q5 5 10 0" stroke="\${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</g><g class="face face--shock">
  <circle cx="26" cy="36" r="2.2" fill="\${INK}"/>
  <circle cx="38" cy="36" r="2.2" fill="\${INK}"/>
  <circle cx="32" cy="45" r="3.2" fill="\${INK}"/>
</g>\`;

const S = (name, body) => \`<svg class="veg" data-name="\${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">\${body}\${FACE_LAYERS}</svg>\`;

const BODIES = OPENMOJI_BODIES;

export const ICON_NAMES = ${JSON.stringify(ICON_NAMES)};

export const ICON_LABELS = Object.freeze(${JSON.stringify(ICON_LABELS, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:')});

export const ICONS = {
${iconEntries}
};


// 在 SVG 闭合前注入表情层。
export function withFace(svg, face) {
  if (!face) return svg.replace(/<g class="face[^"]*">[\\s\\S]*?<\\/g>\\s*(<\\/svg>)/, '$1');
  const layer = face === 'happy'
    ? \`<g class="face face--happy">
         <path d="M22 36q4-4 8 0M34 36q4-4 8 0M27 43q5 5 10 0" stroke="\${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
       </g>\`
    : \`<g class="face face--shock">
         <circle cx="26" cy="36" r="2.2" fill="\${INK}"/>
         <circle cx="38" cy="36" r="2.2" fill="\${INK}"/>
         <circle cx="32" cy="45" r="3.2" fill="\${INK}"/>
       </g>\`;
  return svg.replace('</svg>', \` layer</svg>\`.replace(' layer', layer));
}
`;
writeFileSync('game/svg-icons.js', next);
console.log('已重写 game/svg-icons.js');
