// Original AI-generated chibi garden characters, shared transparent sprite atlas.
// Runtime SVG viewports frame each complete character without duplicating bitmap requests.
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


const SPRITE_BOXES = [[10, 12, 285, 280], [300, 32, 296, 266], [601, 61, 247, 238], [865, 7, 217, 290], [1119, 15, 262, 287], [52, 297, 227, 276], [317, 303, 244, 266], [613, 322, 224, 245], [913, 301, 190, 276], [1136, 304, 242, 268], [13, 572, 292, 257], [319, 572, 266, 258], [612, 575, 238, 258], [887, 585, 232, 248], [1140, 576, 250, 265], [27, 842, 260, 256], [338, 830, 230, 271], [588, 834, 280, 263], [882, 846, 252, 252], [1138, 840, 254, 266]];
export const ATLAS_URL = '/assets/q-garden-clean-atlas.png';
export const ICONS = Object.fromEntries(ICON_NAMES.map((name, index) => {
  const [x, y, width, height] = SPRITE_BOXES[index];
  const pad = 0;
  return [name, `<svg class="veg" data-name="${name}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><svg x="0" y="0" width="64" height="64" viewBox="${x-pad} ${y-pad} ${width+pad*2} ${height+pad*2}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="${ATLAS_URL}" width="1402" height="1122"/></svg></svg>`];
}));

// The artwork carries its own facial expressions; feedback animates the whole character.
export function withFace(svg) { return svg; }
