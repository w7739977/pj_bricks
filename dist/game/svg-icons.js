// Original AI-generated chibi garden characters, shared transparent sprite atlas.
// Each character is a separate transparent PNG; there is no runtime atlas clipping.
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


export const SPRITE_URLS = Object.freeze(Object.fromEntries(
  ICON_NAMES.map(name => [name, `/assets/sprites/${name}.png`])
));
export const ICONS = Object.fromEntries(ICON_NAMES.map(name => [name,
  `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><image href="${SPRITE_URLS[name]}" x="0" y="0" width="64" height="64"/></svg>`
]));

// The artwork carries its own facial expressions; feedback animates the whole character.
export function withFace(svg) { return svg; }
