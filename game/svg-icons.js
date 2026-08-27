// 20 个高饱和手绘田园图标。《羊了个羊》风格参照：
// 奶油底上的深棕粗描边贴纸（stroke 4.2）、饱和平涂、少量深色细节线，
// 保证小尺寸下轮廓鲜明、每个元素一眼可分辨。
// 顺序对应 board.js 中的图案编号。

// 20 个高饱和手绘田园图标。《羊了个羊》风格完全重绘：
// Q弹圆润造型、深棕粗描边(4.6px)、高饱和平涂、单点白色高光，
// 元素占格率 ~85%，小尺寸下剪影与色相双重可分辨。
// 顺序对应 board.js 中的图案编号。

const INK = '#3D2B1F';
const HILITE = '#FFFFFF';
const S = (name, body) => `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><g stroke="${INK}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

const GLOSS = (cx, cy, rx, ry, rot = -25) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${HILITE}" stroke="none" opacity="0.7"/>`;

const BODIES = {
 broccoli: `
   <path d="M26 36h12l-2 18H28Z" fill="#9BD65A"/>
   <path d="M14 34c-5-8-1-16 6-17-1-8 9-13 15-8 8-6 19 0 17 9 7 3 7 12 0 16Z" fill="#33B24E"/>
   <circle cx="22" cy="24" r="2.6" fill="#1E8A3C" stroke="#1E8A3C" stroke-width="2.4"/>
   <circle cx="33" cy="19" r="2.6" fill="#1E8A3C" stroke="#1E8A3C" stroke-width="2.4"/>
   <circle cx="42" cy="26" r="2.6" fill="#1E8A3C" stroke="#1E8A3C" stroke-width="2.4"/>`,
 lettuce: `
   <path d="M10 38c0-9 8-15 12-20 3 4 4 8 10 8s7-4 10-8c4 5 12 11 12 20 0 12-10 20-22 20S10 50 10 38Z" fill="#8FD455"/>
   <path d="M18 40c4 5 10 8 14 8m14-8c-4 5-10 8-14 8" stroke="#57A93A" stroke-width="3"/>
   <path d="M32 30v16" stroke="#57A93A" stroke-width="3"/>`,
 tomato: `
   <path d="M32 18c12-2 21 7 21 18 0 12-9 21-21 21S11 48 11 36c0-11 9-20 21-18Z" fill="#EE4035"/>
   <path d="M32 20V12m0 0-6 2m6-2 6 2M32 12h-7m7 0h7" stroke="#3E9B35"/>
   <path d="M25 13c-3-3-7-3-9 0 2 3 6 4 9 2m14-2c3-3 7-3 9 0-2 3-6 4-9 2" fill="#3E9B35"/>`,
 carrot: `
   <path d="M27 22h12l-3 31c-.5 5-5.5 5-6 0Z" fill="#F58A23"/>
   <path d="m29 24-4 6m13-6 4 6M32 24l-1 8" stroke="#CE6015" stroke-width="2.6"/>
   <path d="M33 22c-8-2-11-8-8-14 5 1 9 6 8 14Zm-2 0c8-3 13 0 14 6-5 3-11 1-14-6Zm1 0c0-6 4-11 10-11 0 6-4 10-10 11Z" fill="#4CAF43"/>`,
 corn: `
   <path d="M23 18c5-6 13-6 18 0l-2 30c-3 6-11 6-14 0Z" fill="#FFCB38"/>
   <path d="M30 20v30m8-32v32M23 27h17m-18 9h17m-17 9h14" stroke="#DA9819" stroke-width="2.4"/>
   <path d="M22 18c-7 2-10 12-8 24 1 8 4 13 8 15l5-39Z" fill="#5FAF41"/>
   <path d="M42 18c7 2 10 12 8 24-1 8-4 13-8 15l-5-39Z" fill="#67BB47"/>`,
 eggplant: `
   <path d="M24 22c-7 4-10 14-6 23 4 10 16 13 25 6 9-7 9-20 0-27-6-5-13-4-19-2Z" fill="#8E44BE"/>
   <path d="M26 20l-2-8 8 4 3-9 3 9 8-4-2 8" fill="#57AB40"/>
   <path d="M24 46c5 5 12 6 17 2" stroke="#6E2E96" stroke-width="2.8"/>`,
 onion: `
   <path d="M32 14c-8 4-17 12-17 26 0 11 8 17 17 17s17-6 17-17c0-14-9-22-17-26Z" fill="#C58ADB"/>
   <path d="M32 14c-2-4-5-6-9-6m9 6c1-4 4-7 8-7" stroke="#5E8C38"/>
   <path d="M25 24c-3 9-2 20 3 28m11-28c3 9 2 20-3 28" stroke="#9355AE" stroke-width="2.8"/>`,
 potato: `
   <path d="M12 35c0-11 9-18 20-18s21 7 20 19c-1 11-9 18-20 18S12 47 12 35Z" fill="#C69A62"/>
   <path d="M24 27l3-2m13 3 3-2m-2 15 3-2M28 42l3-2m-16-3 3-2" stroke="#8A6338" stroke-width="3"/>`,
 cucumber: `
   <path d="M12 37c-1-9 8-16 20-19 12-4 23-1 25 8 2 9-7 17-19 20-12 4-25 1-26-9Z" fill="#61AA3B"/>
   <path d="M24 32l2 1m9-7 2 1m9 4 2 1m-19 8 2 1m10 0 2 1" stroke="#37671F" stroke-width="3"/>
   <path d="M16 37c9 3 24-1 34-9" stroke="#95CF63" stroke-width="2.6"/>`,
 pepper: `
   <path d="M32 20c-11 0-19 8-17 19 2 10 10 17 17 17s15-7 17-17c2-11-6-19-17-19Z" fill="#3EA245"/>
   <path d="M32 22v32m-8-31c-3 9-3 22 0 30m16-30c3 9 3 22 0 30" stroke="#237A33" stroke-width="2.8"/>`,
 pumpkin: `
   <path d="M11 37c0-11 9-18 21-18s21 7 21 18-9 19-21 19-21-8-21-19Z" fill="#F5921E"/>
   <path d="M22 22c-5 9-5 21 0 30m20-30c5 9 5 21 0 30M32 20v35" stroke="#D96C15" stroke-width="2.8"/>
   <path d="M32 20c-1-6 2-10 7-11-1 5-2 8-7 11Zm-2 0c-4-3-8-2-10 1 3 2 7 2 10-1Z" fill="#6B8F37"/>`,
 grape: `
   <path d="M32 16c-2-5 0-9 5-11 1 5-1 9-5 11Zm-1-2C26 8 20 8 16 11c3 4 9 5 15 3Z" fill="#54A83E"/>
   <circle cx="21" cy="26" r="7.5" fill="#9046C2"/><circle cx="35" cy="24" r="7.5" fill="#9B4FD0"/>
   <circle cx="16" cy="38" r="7.5" fill="#813CB4"/><circle cx="30" cy="37" r="7.5" fill="#9F55D6"/>
   <circle cx="44" cy="36" r="7.5" fill="#8843BC"/><circle cx="23" cy="49" r="7.5" fill="#984ECF"/>
   <circle cx="38" cy="48" r="7.5" fill="#7E3AAD"/>`,
 apple: `
   <path d="M17 28c-1-8 6-13 15-10 9-3 16 2 15 10 1 12-6 24-15 27-9-3-16-15-15-27Z" fill="#E8483E"/>
   <path d="M32 18c-1-6 2-10 7-12" stroke="#5C432A"/>
   <path d="M39 8c6-2 11 1 12 6-6 2-11-1-12-6Z" fill="#56AC42"/>`,
 strawberry: `
   <path d="M32 16c-11 0-17 6-14 17 3 11 9 21 14 23 5-2 11-12 14-23 3-11-3-17-14-17Z" fill="#F4436B"/>
   <path d="M19 18c3-5 8-7 13-4 5-3 10-1 13 4-4 4-8 6-13 5-5 1-9-1-13-5Z" fill="#52A93F"/>
   <path d="M26 28l2 1m9-1 2 1m-11 9 2 1m9 0 2 1m-13 8 2 1" stroke="#FFE35A" stroke-width="3"/>`,
 banana: `
   <path d="M11 34c8 13 22 19 35 12 7-4 10-11 8-19-7 7-15 10-24 8-7-2-11-5-14-10-4 2-6 5-5 9Z" fill="#FFD84D"/>
   <path d="M17 31c8 9 20 13 32 7" stroke="#DBA020" stroke-width="2.6"/>
   <path d="M9 33c-1-2 0-4 2-5m43 3c2 2 2 4 1 6" stroke="#8A6338" stroke-width="3"/>`,
 orange: `
   <circle cx="32" cy="37" r="20" fill="#FF972F"/>
   <path d="M32 17c1-6 5-9 11-9-1 6-5 9-11 9Z" fill="#54AB41"/>
   <path d="M22 33c1 6 4 10 8 12" stroke="#E0770E" stroke-width="2.6"/>`,
 pear: `
   <path d="M35 16c1 7 11 11 13 22 2 12-6 20-16 20s-18-8-16-20c2-11 12-15 13-22 2-3 4-3 6 0Z" fill="#B8D455"/>
   <path d="M33 14c0-5 3-8 7-9" stroke="#5C432A"/>
   <path d="M40 7c6-2 11 1 12 6-6 2-11-1-12-6Z" fill="#54A83E"/>`,
 cherry: `
   <path d="M24 34C27 20 35 13 45 11m-7 30c0-10 0-20-1-28" stroke="#5C432A"/>
   <path d="M46 12c-5-6-11-5-13-1 4 3 9 4 13 1Z" fill="#54A83E"/>
   <circle cx="20" cy="46" r="11" fill="#ED4242"/><circle cx="40" cy="47" r="11" fill="#F4574E"/>`,
 peach: `
   <path d="M13 38c-1-13 8-22 19-22s21 9 19 22c-2 12-11 20-19 20s-17-8-19-20Z" fill="#FB8E77"/>
   <path d="M35 20c3 10 1 25-4 33" stroke="#E76A50" stroke-width="2.8"/>
   <path d="M35 20c2-7 8-10 14-8-2 7-7 10-14 8Z" fill="#58AD43"/>`,
 watermelon: `
   <path d="M8 36c6-14 17-21 30-18 13 3 19 15 13 25-7 13-23 17-36 11C7 50 4 43 8 36Z" fill="#53AF4A"/>
   <path d="M15 38c6-9 16-14 28-12 4 8-2 17-12 21-9 4-16 0-16-9Z" fill="#F04848"/>
   <path d="m24 36 2 1m9-6 2 1m4 8 2 1m-13 5 2 1" stroke="#3D2314" stroke-width="2.6"/>`,
};

export const ICON_NAMES = [
  'broccoli', 'lettuce', 'tomato', 'carrot', 'corn',
  'eggplant', 'onion', 'potato', 'cucumber', 'pepper',
  'pumpkin', 'grape', 'apple', 'strawberry',
  'banana', 'orange', 'pear', 'cherry', 'peach', 'watermelon',
];

export const ICON_LABELS = Object.freeze({
  broccoli: '西兰花', lettuce: '生菜', tomato: '番茄', carrot: '胡萝卜', corn: '玉米',
  eggplant: '茄子', onion: '洋葱', potato: '土豆', cucumber: '黄瓜', pepper: '青椒',
  pumpkin: '南瓜', grape: '葡萄', apple: '苹果', strawberry: '草莓',
  banana: '香蕉', orange: '橙子', pear: '梨', cherry: '樱桃', peach: '桃子', watermelon: '西瓜',
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
  return svg.replace('</svg>', `${layer}</svg>`);
}
