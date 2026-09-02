// 最终棋子贴图：Fluent Emoji Flat（MIT）形体 + OpenMoji 风格深棕描边。
// 用法：node tools/apply-final-icons.mjs
// 产出：game/icon-bodies.mjs + 重写 game/svg-icons.js 的贴图源。
// 经 Iconify API 拉取，构建期内联，运行时零外部请求。
import { writeFileSync } from 'node:fs';
import { ICON_NAMES, ICON_LABELS } from '../game/svg-icons.js';

const FLAT_MAP = {
  broccoli: ['broccoli'], lettuce: ['leafy-green'], tomato: ['tomato'], carrot: ['carrot'],
  corn: ['ear-of-corn', 'corn'], eggplant: ['eggplant'], onion: ['onion'], potato: ['potato'],
  cucumber: ['cucumber'], pepper: ['bell-pepper', 'bell-pepper-red', 'pepper'],
  pumpkin: ['jack-o-lantern', 'pumpkin'], grape: ['grapes'], apple: ['red-apple'],
  strawberry: ['strawberry'], banana: ['banana'], orange: ['tangerine'], pear: ['pear'],
  cherry: ['cherries'], peach: ['peach'], watermelon: ['watermelon'],
};

// 描边口径对齐 OpenMoji 观感：约画布 3.4% 的线宽、圆角衔接
const INK = '#3D2B1F';
const STROKE = 1.1; // 32 画布 → 64 网格后约 2.2px

async function fetchFlat(name) {
  for (const n of FLAT_MAP[name]) {
    const res = await fetch(`https://api.iconify.design/fluent-emoji-flat/${n}.svg`);
    if (res.ok) {
      const t = await res.text();
      if (t.includes('svg')) return t;
    }
  }
  throw new Error(`no fluent icon for ${name}`);
}

const innerOf = svg => svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].trim();

console.log('拉取 Fluent Emoji Flat…');
const bodies = {};
for (const name of ICON_NAMES) {
  const inner = innerOf(await fetchFlat(name))
    .replace(/\s(width|height)="[^"]*"/g, '');
  // 32 画布 → 64 网格居中；描边加在外层 g，路径自身的 fill 不受影响
  bodies[name] =
    `<g transform="scale(2)" stroke="${INK}" stroke-width="${STROKE}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${inner}\n</g>`;
  process.stdout.write(`  ${name} ok\n`);
}

writeFileSync('game/icon-bodies.mjs',
  `// 棋子贴图数据：Fluent Emoji Flat（MIT，Copyright (c) Microsoft Corporation）\n` +
  `// 形体 + 项目自加的深棕描边层。由 tools/apply-final-icons.mjs 生成，勿手改。\n\n` +
  `export const ICON_BODIES = {\n` +
  ICON_NAMES.map(n => `  ${n}: \`\n${bodies[n]}\`,`).join('\n') +
  `\n};\n`);
console.log('已生成 game/icon-bodies.mjs');

// ---- 重写 svg-icons.js ----
const iconEntries = ICON_NAMES.map(n => `  ${n}: S("${n}", BODIES.${n}),`).join('\n\n');
const next = `// 棋子图标：Fluent Emoji Flat（MIT，© Microsoft）形体 + OpenMoji 风格深棕描边，
// 由 tools/apply-final-icons.mjs 构建期内联（运行时零外部请求）。
// 表情层（消除特效的震惊/开心脸）为项目自绘，叠加在贴图之上。
// 顺序对应 board.js 中的图案编号。

import { ICON_BODIES } from './icon-bodies.mjs';

const INK = '#3D2B1F';
// 预置表情层：默认隐藏，由 CSS 按容器 svg 的 face-* 类点亮。
const FACE_LAYERS = \`<g class="face face--happy">
  <path d="M22 36q4-4 8 0M34 36q4-4 8 0M27 43q5 5 10 0" stroke="\${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</g><g class="face face--shock">
  <circle cx="26" cy="36" r="2.2" fill="\${INK}"/>
  <circle cx="38" cy="36" r="2.2" fill="\${INK}"/>
  <circle cx="32" cy="45" r="3.2" fill="\${INK}"/>
</g>\`;

const S = (name, body) => \`<svg class="veg" data-name="\${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">\${body}\${FACE_LAYERS}</svg>\`;

const BODIES = ICON_BODIES;

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
