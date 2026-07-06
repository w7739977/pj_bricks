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
    <path d="M20 24 Q14 18 18 12 Q22 6 30 10 Q38 4 44 10 Q52 8 50 18 Q56 22 50 28 Q52 36 42 36 L26 36 Q18 36 20 24 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M30 34 L28 54 L36 54 L34 34 Z" fill="#9CCC65" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  lettuce: S('lettuce', `
    <path d="M10 36 Q8 22 22 20 Q26 10 38 14 Q50 10 52 24 Q60 30 52 42 Q46 54 30 52 Q14 50 10 36 Z" fill="#7CB342" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M22 30 Q26 26 30 30 M34 26 Q38 22 42 26 M26 40 Q30 36 34 40" stroke="#558B2F" stroke-width="2" fill="none" stroke-linecap="round"/>
  `),
  tomato: S('tomato', `
    <circle cx="32" cy="38" r="20" fill="#E53935" stroke="#2E1F1A" stroke-width="3"/>
    <path d="M22 18 L26 12 L30 18 L34 12 L38 18 L42 12 L46 18 L42 22 L22 22 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  carrot: S('carrot', `
    <path d="M32 8 L24 22 L26 50 Q32 56 38 50 L40 22 Z" fill="#FB8C00" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M28 32 L34 30 M26 40 L34 38 M28 46 L36 44" stroke="#E65100" stroke-width="2" stroke-linecap="round"/>
    <path d="M28 14 L22 4 L26 12 L32 2 L32 12 L38 4 L42 14 L36 12" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  corn: S('corn', `
    <path d="M22 16 Q32 8 42 16 L40 52 Q32 58 24 52 Z" fill="#FDD835" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M14 18 Q22 12 28 22 L18 50 Q12 44 14 32 Z" fill="#7CB342" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M50 18 Q42 12 36 22 L46 50 Q52 44 50 32 Z" fill="#7CB342" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="28" cy="24" r="2" fill="#F9A825"/><circle cx="34" cy="26" r="2" fill="#F9A825"/>
    <circle cx="26" cy="32" r="2" fill="#F9A825"/><circle cx="32" cy="34" r="2" fill="#F9A825"/>
    <circle cx="28" cy="42" r="2" fill="#F9A825"/><circle cx="34" cy="44" r="2" fill="#F9A825"/>
  `),
  eggplant: S('eggplant', `
    <path d="M22 18 Q14 26 18 42 Q22 56 34 56 Q48 56 48 40 Q48 24 38 20 Z" fill="#7E57C2" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M22 18 L18 8 L26 14 L30 4 L34 14 L42 6 L40 18 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  onion: S('onion', `
    <path d="M32 8 Q12 24 18 44 Q24 58 32 58 Q40 58 46 44 Q52 24 32 8 Z" fill="#C490D1" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M32 8 L32 58 M24 22 Q32 28 40 22 M22 36 Q32 42 42 36" stroke="#7B1FA2" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M30 8 L26 2 L34 2 Z" fill="#558B2F" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  potato: S('potato', `
    <path d="M14 30 Q12 18 24 14 Q40 10 50 22 Q56 36 46 50 Q32 56 20 48 Q12 40 14 30 Z" fill="#A1887F" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="22" cy="26" r="2" fill="#5D4037"/><circle cx="36" cy="22" r="2" fill="#5D4037"/>
    <circle cx="44" cy="34" r="2" fill="#5D4037"/><circle cx="28" cy="42" r="2" fill="#5D4037"/>
  `),
  cucumber: S('cucumber', `
    <path d="M8 38 Q6 22 18 18 Q34 12 48 18 Q58 26 54 40 Q48 52 32 50 Q16 50 8 38 Z" fill="#558B2F" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" transform="rotate(-20 32 32)"/>
    <circle cx="22" cy="28" r="1.5" fill="#33691E"/><circle cx="32" cy="24" r="1.5" fill="#33691E"/>
    <circle cx="42" cy="30" r="1.5" fill="#33691E"/><circle cx="28" cy="36" r="1.5" fill="#33691E"/>
    <circle cx="38" cy="40" r="1.5" fill="#33691E"/>
  `),
  pepper: S('pepper', `
    <path d="M22 20 Q14 28 18 44 Q22 56 32 54 Q44 50 44 36 Q42 24 32 22 Z" fill="#2E7D32" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M28 22 L22 12 L32 18 L36 8 L40 18" fill="#388E3C" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  pumpkin: S('pumpkin', `
    <ellipse cx="20" cy="38" rx="10" ry="16" fill="#F57C00" stroke="#2E1F1A" stroke-width="3"/>
    <ellipse cx="32" cy="38" rx="14" ry="18" fill="#FB8C00" stroke="#2E1F1A" stroke-width="3"/>
    <ellipse cx="44" cy="38" rx="10" ry="16" fill="#F57C00" stroke="#2E1F1A" stroke-width="3"/>
    <path d="M32 14 L30 8 L34 8 Z" fill="#5D4037" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  grape: S('grape', `
    <circle cx="24" cy="30" r="6" fill="#8E24AA" stroke="#2E1F1A" stroke-width="3"/>
    <circle cx="36" cy="30" r="6" fill="#8E24AA" stroke="#2E1F1A" stroke-width="3"/>
    <circle cx="30" cy="38" r="6" fill="#7B1FA2" stroke="#2E1F1A" stroke-width="3"/>
    <circle cx="42" cy="40" r="6" fill="#8E24AA" stroke="#2E1F1A" stroke-width="3"/>
    <circle cx="24" cy="44" r="6" fill="#7B1FA2" stroke="#2E1F1A" stroke-width="3"/>
    <circle cx="34" cy="48" r="6" fill="#6A1B9A" stroke="#2E1F1A" stroke-width="3"/>
    <path d="M30 18 L26 8 L36 4 L40 14 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  apple: S('apple', `
    <path d="M18 28 Q14 16 26 14 Q32 12 32 22 Q32 12 38 14 Q50 16 46 28 Q50 48 38 54 Q32 56 26 54 Q14 48 18 28 Z" fill="#D32F2F" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M32 18 L30 8 L36 6" stroke="#5D4037" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M36 12 Q44 8 46 16 Q40 18 36 14 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  `),
  strawberry: S('strawberry', `
    <path d="M32 14 Q14 18 22 40 Q28 56 32 56 Q36 56 42 40 Q50 18 32 14 Z" fill="#E91E63" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M22 14 L26 4 L30 12 L34 4 L38 12 L42 4 L46 14 Q34 18 22 14 Z" fill="#43A047" stroke="#2E1F1A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
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
