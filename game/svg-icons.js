// 棋子图标：贴图采用 OpenMoji（CC BY-SA 4.0，https://openmoji.org），
// 由 tools/apply-openmoji.mjs 构建期内联（运行时零外部请求）。
// 表情层（消除特效的震惊/开心脸）仍为项目自绘，叠加在贴图之上。
// 顺序对应 board.js 中的图案编号。

import { OPENMOJI_BODIES } from './openmoji-bodies.mjs';

const INK = '#3D2B1F';
// 预置表情层：默认隐藏，由 CSS 按容器 svg 的 face-* 类点亮。
// 消除特效只切换 class，避免每次序列化/重建 SVG 字符串。
const FACE_LAYERS = `<g class="face face--happy">
  <path d="M22 36q4-4 8 0M34 36q4-4 8 0M27 43q5 5 10 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</g><g class="face face--shock">
  <circle cx="26" cy="36" r="2.2" fill="${INK}"/>
  <circle cx="38" cy="36" r="2.2" fill="${INK}"/>
  <circle cx="32" cy="45" r="3.2" fill="${INK}"/>
</g>`;

const S = (name, body) => `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">${body}${FACE_LAYERS}</svg>`;

const BODIES = OPENMOJI_BODIES;

export const ICON_NAMES = ["broccoli","lettuce","tomato","carrot","corn","eggplant","onion","potato","cucumber","pepper","pumpkin","grape","apple","strawberry","banana","orange","pear","cherry","peach","watermelon"];

export const ICON_LABELS = Object.freeze({
  broccoli: "西兰花",
  lettuce: "生菜",
  tomato: "番茄",
  carrot: "胡萝卜",
  corn: "玉米",
  eggplant: "茄子",
  onion: "洋葱",
  potato: "土豆",
  cucumber: "黄瓜",
  pepper: "青椒",
  pumpkin: "南瓜",
  grape: "葡萄",
  apple: "苹果",
  strawberry: "草莓",
  banana: "香蕉",
  orange: "橙子",
  pear: "梨",
  cherry: "樱桃",
  peach: "桃子",
  watermelon: "西瓜"
});

export const ICONS = {
  broccoli: S("broccoli", BODIES.broccoli),

  lettuce: S("lettuce", BODIES.lettuce),

  tomato: S("tomato", BODIES.tomato),

  carrot: S("carrot", BODIES.carrot),

  corn: S("corn", BODIES.corn),

  eggplant: S("eggplant", BODIES.eggplant),

  onion: S("onion", BODIES.onion),

  potato: S("potato", BODIES.potato),

  cucumber: S("cucumber", BODIES.cucumber),

  pepper: S("pepper", BODIES.pepper),

  pumpkin: S("pumpkin", BODIES.pumpkin),

  grape: S("grape", BODIES.grape),

  apple: S("apple", BODIES.apple),

  strawberry: S("strawberry", BODIES.strawberry),

  banana: S("banana", BODIES.banana),

  orange: S("orange", BODIES.orange),

  pear: S("pear", BODIES.pear),

  cherry: S("cherry", BODIES.cherry),

  peach: S("peach", BODIES.peach),

  watermelon: S("watermelon", BODIES.watermelon),
};


// 在 SVG 闭合前注入表情层。
export function withFace(svg, face) {
  if (!face) return svg.replace(/<g class="face[^"]*">[\s\S]*?<\/g>\s*(<\/svg>)/, '$1');
  const layer = face === 'happy'
    ? `<g class="face face--happy">
         <path d="M22 36q4-4 8 0M34 36q4-4 8 0M27 43q5 5 10 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
       </g>`
    : `<g class="face face--shock">
         <circle cx="26" cy="36" r="2.2" fill="${INK}"/>
         <circle cx="38" cy="36" r="2.2" fill="${INK}"/>
         <circle cx="32" cy="45" r="3.2" fill="${INK}"/>
       </g>`;
  return svg.replace('</svg>', ` layer</svg>`.replace(' layer', layer));
}
