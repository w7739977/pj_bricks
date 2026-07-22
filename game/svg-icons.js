// 20 个高饱和手绘田园图标。统一深棕粗描边、平涂和少量内部纹理。
// 顺序对应 board.js 中的图案编号。

const INK = '#34291D';
const S = (name, body) => `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><g stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

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
  broccoli: S('broccoli', `
    <path d="M27 33 25 55h14l-3-22Z" fill="#8CCB4F"/>
    <path d="M18 34c-7-2-9-10-4-15-2-7 6-13 12-9 4-8 15-7 18 0 8-2 13 6 10 12 5 6 0 14-8 14Z" fill="#2EAF4A"/>
    <path d="M20 24c4-3 8-2 10 2M36 18c4-3 9-1 10 3" stroke="#167C36" stroke-width="2.2"/>
  `),
  lettuce: S('lettuce', `
    <path d="M11 37c-3-9 2-17 10-19 1-8 11-11 17-5 7-4 16 2 14 10 8 4 7 15 1 20-4 9-15 13-25 10-10 2-20-6-17-16Z" fill="#92D45D"/>
    <path d="M19 31c5-5 10-4 13 1 4-7 11-8 16-3M18 42c6-4 10-2 13 3 4-5 10-6 15-2" stroke="#4C9B38" stroke-width="2.2"/>
  `),
  tomato: S('tomato', `
    <path d="M15 37c0-14 9-21 18-20 10-2 19 7 18 20 1 12-7 20-18 20-11 1-19-7-18-20Z" fill="#EF413D"/>
    <path d="m21 19 5-8 6 6 5-8 3 9 8-3-5 9H22l-6-7Z" fill="#4FA83C"/>
    <path d="M22 34c2-6 7-9 12-9" stroke="#FF7A65" stroke-width="2.2"/>
  `),
  carrot: S('carrot', `
    <path d="M22 22 31 55c1 4 5 4 7 0l8-33Z" fill="#F58B25"/>
    <path d="m24 23-8-12 11 5L28 5l5 11L40 5l-2 12 11-6-6 13Z" fill="#4DAA43"/>
    <path d="m28 32 8-2m-6 10 8-2m-5 10 7-2" stroke="#C85B20" stroke-width="2.2"/>
  `),
  corn: S('corn', `
    <path d="M22 15c6-5 15-5 21 1l-3 38c-5 5-12 5-17 0Z" fill="#FFD43B"/>
    <path d="M23 22C14 17 12 28 14 43c1 7 5 11 10 13l4-28Z" fill="#68B846"/>
    <path d="M42 22c9-5 11 6 9 21-1 7-5 11-10 13l-4-28Z" fill="#58A93E"/>
    <path d="M28 20v31m7-33v34M23 27h19m-18 9h17m-17 9h16" stroke="#D69B20" stroke-width="1.8"/>
  `),
  eggplant: S('eggplant', `
    <path d="M25 19c-8 5-12 17-8 28 4 12 17 14 26 7 9-7 11-20 4-29-5-6-14-9-22-6Z" fill="#8F4DB7"/>
    <path d="m23 20-5-10 10 4 4-9 4 9 10-5-4 12Z" fill="#55A743"/>
    <path d="M23 45c5 6 13 7 19 1" stroke="#71328F" stroke-width="2.2"/>
  `),
  onion: S('onion', `
    <path d="M32 8c-3 9-16 14-16 30 0 12 7 19 16 19s16-7 16-19C48 22 35 17 32 8Z" fill="#B77BD0"/>
    <path d="m32 9-3-7m3 7 5-6" stroke="#5E8C38"/>
    <path d="M25 22c-2 12 1 24 7 34m7-34c2 12-1 24-7 34M21 36h22" stroke="#7D45A6" stroke-width="2.1"/>
  `),
  potato: S('potato', `
    <path d="M13 34c-2-12 8-21 20-22 14-1 23 8 20 22 2 12-7 21-20 22-13 0-23-8-20-22Z" fill="#B99573"/>
    <path d="m22 26 2-1m15-4 2 1m4 14 2 1M29 43l2 1M18 38l2-1" stroke="#73533E" stroke-width="3"/>
  `),
  cucumber: S('cucumber', `
    <path d="M9 38c-2-9 7-18 20-22 13-5 25-1 27 8 3 9-6 18-19 22-13 5-25 1-28-8Z" fill="#66A63C"/>
    <path d="m22 30 1 1m10-7 1 1m10 5 1 1m-18 9 1 1m12-1 1 1" stroke="#315F2A" stroke-width="3"/>
    <path d="M14 36c9 3 26-2 36-10" stroke="#8FCB5A" stroke-width="2.1"/>
  `),
  pepper: S('pepper', `
    <path d="M24 20c-8 7-9 22-3 31 5 8 16 8 22 1 7-8 8-22 1-29-5-5-14-7-20-3Z" fill="#3D9C48"/>
    <path d="m25 20-5-9 10 4 4-9 3 10 9-4-4 10Z" fill="#5EAE43"/>
    <path d="M27 29c-2 8 0 15 5 21" stroke="#23743A" stroke-width="2.1"/>
  `),
  pumpkin: S('pumpkin', `
    <path d="M14 39c0-11 7-18 18-18s18 7 18 18-7 17-18 17-18-6-18-17Z" fill="#F39424"/>
    <path d="M23 23c-6 8-6 25 0 31m18-31c6 8 6 25 0 31M32 22v33" stroke="#D66B1D" stroke-width="2.2"/>
    <path d="m31 21-2-10 7-2 1 11" fill="#6A8D36"/>
  `),
  grape: S('grape', `
    <path d="m31 17-2-10 11-3 4 9Z" fill="#56A33E"/>
    <circle cx="23" cy="27" r="7" fill="#8D3BB0"/><circle cx="36" cy="27" r="7" fill="#9B42BD"/>
    <circle cx="29" cy="38" r="7" fill="#7F35A5"/><circle cx="43" cy="39" r="7" fill="#913CB4"/>
    <circle cx="22" cy="48" r="7" fill="#923CB6"/><circle cx="36" cy="50" r="7" fill="#713094"/>
  `),
  apple: S('apple', `
    <path d="M18 28c-3-9 5-15 13-11 8-5 18 1 15 11 5 11-2 25-13 28-12 1-21-15-15-28Z" fill="#E7473F"/>
    <path d="M32 18c0-7 2-11 7-14" stroke="#6C4B2C"/>
    <path d="M36 11c5-6 12-4 13 3-5 3-10 2-13-1Z" fill="#58A944"/>
    <path d="M21 33c1-5 4-8 8-9" stroke="#FF7667" stroke-width="2.2"/>
  `),
  strawberry: S('strawberry', `
    <path d="M32 15c-12 0-18 7-14 19 4 12 10 22 14 23 5-1 12-12 15-23 3-12-3-19-15-19Z" fill="#F04A61"/>
    <path d="m18 17 6-10 5 8 5-10 4 10 9-7-3 12Z" fill="#56AA43"/>
    <g fill="#FFE35A" stroke="none"><circle cx="26" cy="29" r="2"/><circle cx="36" cy="27" r="2"/><circle cx="41" cy="35" r="2"/><circle cx="29" cy="39" r="2"/><circle cx="34" cy="48" r="2"/></g>
  `),
  banana: S('banana', `
    <path d="M10 35c8 14 24 20 38 11 7-4 10-12 8-20-8 8-17 12-27 9-7-2-12-6-16-11-3 3-4 7-3 11Z" fill="#F4D54A"/>
    <path d="M15 29c10 11 24 15 36 7" stroke="#D29B24" stroke-width="2.2"/>
  `),
  orange: S('orange', `
    <circle cx="32" cy="35" r="20" fill="#F69227"/>
    <path d="M31 15c3-8 10-11 17-8-2 7-8 10-16 9Z" fill="#5AAA43"/>
    <path d="M19 35h26M32 22v26" stroke="#D76C1E" stroke-width="1.8"/>
  `),
  pear: S('pear', `
    <path d="M35 13c2 8 12 12 13 24 1 12-6 20-17 20S13 49 16 37c2-10 12-15 13-24Z" fill="#ACD052"/>
    <path d="M34 13c0-5 2-8 6-10"/>
    <path d="M38 9c6-5 11-3 13 2-5 3-9 2-13-2Z" fill="#56A640"/>
  `),
  cherry: S('cherry', `
    <path d="M18 36c-7 0-12 6-11 13 1 8 9 11 15 7 6 4 14 1 15-7 1-7-5-13-12-13Z" fill="#E84747"/>
    <path d="M39 34c-7 0-12 6-11 13 1 8 9 11 15 7 6 4 14 1 15-7 1-7-5-13-12-13Z" fill="#EF5A50"/>
    <path d="M22 36C25 20 34 13 43 10m1 24c0-9-1-17-1-24"/>
    <path d="M40 13c-6-7-12-5-14 0 5 4 10 4 14 0Z" fill="#59A846"/>
  `),
  peach: S('peach', `
    <path d="M13 35c0-14 10-23 22-23 13 0 21 10 18 24-2 13-13 21-24 19-10-2-16-9-16-20Z" fill="#F58B6A"/>
    <path d="M34 13c-4 12-2 28 8 38" stroke="#E96B55" stroke-width="2.2"/>
    <path d="M34 13c4-9 13-10 18-5-4 7-10 9-17 7Z" fill="#5AA844"/>
  `),
  watermelon: S('watermelon', `
    <path d="M8 35c7-15 19-22 34-18 12 3 17 14 11 24-7 12-23 17-36 11C7 48 4 42 8 35Z" fill="#58AD4D"/>
    <path d="M15 37c7-9 18-14 31-12 4 8-3 17-13 21-8 4-16 1-18-9Z" fill="#EF4C4C"/>
    <path d="m22 36 2 1m10-5 2 1m5 6 2 1" stroke="#4F2C1F" stroke-width="2.4"/>
  `),
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
