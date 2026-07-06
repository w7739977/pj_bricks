# 田园连连看 重设计稿

- 日期：2026-07-06
- 范围：A 类 Bug 全修 + 漫画风重皮 + 棋盘竖版 + 死局弹框 + 多文件重构
- 风格参考：ui-ux-pro-max-skill 推荐的 Claymorphism + 粉紫配色

---

## 1. 目标与非目标

### 目标
1. 修复盘点中标记为 A 类的全部 8 项缺陷
2. 引入死局玩家决策弹框（首次重排 / 放弃本局，再次死局 → 游戏结束）
3. 把 14 个 emoji 替换为 inline SVG 漫画蔬菜/水果（保留题材、替换拖拉机为草莓）
4. 棋盘改为 14 行 × 10 列 竖版，移动端优先响应式
5. 把单文件 580 行 IIFE 拆为原生 ES Modules（无构建工具）

### 非目标
- 不引入构建工具（Webpack/Vite 等）
- 不引入测试框架（本次以手测 + 系统验证为准）
- 不改变 0 折直线消除的核心规则（保留独特玩法）
- 不引入后端、排行榜、存档

---

## 2. 视觉设计系统

来源：ui-ux-pro-max-skill `--design-system "田园 farm cartoon comic puzzle game playful vibrant mobile vertical"`

### 2.1 风格：Claymorphism
- 多层柔光投影：`0 8px 24px rgba(85,139,47,0.18), inset 0 0 0 2px rgba(255,255,255,0.65)`
- 圆角：棋盘容器 32，单元格 12，按钮 24
- 按压：`scale(0.94)` + spring 缓动 `cubic-bezier(0.34, 1.56, 0.64, 1)`，150–200ms
- 浮动 blob 装饰：±20px 缓慢漂移，背景层
- 全程支持 `prefers-reduced-motion`：降级为 opacity/scale 0.96

### 2.2 配色（CSS 变量）
```css
--color-primary: #EC4899;    /* 主操作 */
--color-on-primary: #FFFFFF;
--color-secondary: #8B5CF6;  /* 副操作 */
--color-accent: #F59E0B;     /* 提示/连击特效 */
--color-bg: #FDF2F8;
--color-fg: #0F172A;
--color-muted: #FDF4F8;
--color-border: #FCE9F2;
--color-destructive: #DC2626;
--color-ring: #EC4899;
```
蔬菜本体保留饱和自然色（番茄红、玉米黄等），背景/UI 用粉紫。

### 2.3 字体
- 标题：`ZCOOL KuaiLe`（中文漫画体）
- UI/正文：`Baloo 2`（拉丁）+ `Noto Sans SC` 后备（中文）
- 数字（如计分）：`Baloo 2` tabular-nums

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

### 2.4 14 个漫画 SVG 元素

题材：田园蔬菜水果。统一规格：viewBox `0 0 64 64`，3px 黑描边（`stroke-linejoin: round`），饱和填色 + 一抹白色高光。

| # | 名称 | 主色 | 造型要点 |
|---|---|---|---|
| 1 | 西兰花 | `#43A047` 深绿 | 云朵状花冠 + 粗茎 |
| 2 | 生菜 | `#7CB342` 浅绿 | 多瓣皱叶 |
| 3 | 番茄 | `#E53935` 红 | 圆体 + 五角萼片 |
| 4 | 胡萝卜 | `#FB8C00` 橙 | 锥体 + 顶部绿叶 |
| 5 | 玉米 | `#FDD835` 黄 | 棒状 + 交叉粒纹 + 绿苞叶 |
| 6 | 茄子 | `#7E57C2` 深紫 | 葫芦形 + 绿萼 |
| 7 | 洋葱 | `#C490D1` 紫白 | 水滴形 + 顶部芽 + 横纹 |
| 8 | 土豆 | `#A1887F` 棕 | 椭圆 + 凹眼点 |
| 9 | 黄瓜 | `#558B2F` 暗绿 | 长条 + 纵纹 + 凸点 |
| 10 | 青椒 | `#2E7D32` 深绿 | 灯笼形 + 三瓣底 |
| 11 | 南瓜 | `#F57C00` 橙 | 扁圆 + 纵棱 + 棕茎 |
| 12 | 葡萄 | `#8E24AA` 紫 | 葡萄串 + 叶 |
| 13 | 苹果 | `#D32F2F` 红 | 圆体 + 凹柄 + 一片叶 |
| 14 | 草莓 | `#E91E63` 亮红 | 心形 + 黑籽点 + 绿萼 |

**状态动画表情（A8 衍生）**：选中时叠加"眯眼笑" `<g class="face">`，消除瞬间切换为"惊讶 O 嘴"，0.3s 后淡出。非选中态不加表情。

---

## 3. 棋盘布局（14 行 × 10 列 竖版）

```
┌──────────────┐
│  标题  分数   │  ← 顶栏
├──────────────┤
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ │
│      ... 14 行 ...    │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ │
├──────────────┤
│ 💡   🔀   🔄 │  ← 工具栏
└──────────────┘
```

- 总格数 140（14×10），14 种各 10 个，开局可解保证
- 响应式：
  - < 480px：cell 32px + gap 3px（pitch 35px，棋盘 ≈ 350×490）
  - 480–768px：cell 38px + gap 4px
  - ≥ 768px：cell 44px + gap 4px（pitch 48px，棋盘 ≈ 480×672）
- 单元格 `aspect-ratio: 1`，棋盘用 CSS Grid + 自适应 `--pitch` 变量

---

## 4. 死局弹框（A2 + 新需求）

### 状态
```js
state = {
  deadlockCount: 0,   // 本局累计死局次数
}
```

### 流程
1. 消除后调用 `afterEliminate()` → 胜利？→ 否 → `hasAnySolvablePair()`？
2. 死局：`busy = true`，停止接受输入，根据 `deadlockCount`：
   - **0**（首次）：弹框 `#deadlockDialog`
     - 标题："陷入死局了 😵"
     - 副文："当前盘面没有可消除的方块"
     - 按钮：`🔀 让我重排一次` (primary) / `🏳️ 放弃本局` (secondary)
     - 选重排 → `reshuffle(true)` 强制保证可解（attempts 上限提到 1000，仍失败则 EAGAIN 提示）→ `deadlockCount++` → 关弹框 → `busy = false`
     - 选放弃 → `restart()`（重置 deadlockCount = 0）
   - **≥1**（再次）：弹框 `#gameOverDialog`
     - 标题："游戏结束 💔"
     - 副文：`本局共出现 ${deadlockCount + 1} 次死局`
     - 唯一按钮：`🏳️ 放弃本局并重开` (primary) → `restart()`
3. **移除**原 `reshuffle` 自动触发逻辑与"已自动为您重新洗牌"提示

### 弹框实现
- HTML `<dialog>` 元素（原生，自带 a11y + Esc 关闭拦截）
- Claymorphism 卡片样式
- backdrop 50% 黑 + 5px blur
- 入场：scale 0.85→1 + opacity 0→1，200ms ease-out
- 出场：scale 1→0.95 + opacity，150ms ease-in

---

## 5. A 类 Bug 修复方案（全部）

### A1：busy 变量从不赋值
- 修：所有异步窗口设 `setBusy(true/false)`
  - 触发点：死局弹框显示/隐藏、胜利 overlay 显示/隐藏、动画进行中（如重排渲染、回滚动画）
  - 守卫：`onPointerDown`、`onCellClick`、`hint`、`shuffleBtn`、`restartBtn` 都读 busy
- 移除原 `if (busy) return` 形同虚设的写法，改为有效守卫

### A2：死局自动重排
见 §4

### A3：多目标 waiting 推动历史丢弃
- `pointerUp` 进入 waiting 时把 `drag.history` 转存 `state.pendingRevert`
- 玩家点候选 → 提交消除（清除 pendingRevert）
- 玩家点空白或切换到其它方块 → 触发回滚动画 + restoreBoard，再处理新点击
- ESC 或点 anchor 自身取消 → 回滚 + 清 waiting

### A4：边界阻挡后 lastShift 跳跃卡死
现状：`if (result.applied !== 0) {...} else { drag.lastShift = want; }`
改为：
```js
if (result.applied !== 0) {
  drag.lastShift += result.applied;
  // 更新 curR/curC...
} else {
  // 边界阻挡：lastShift 保持不变，等用户继续拖到更远位置时
  // delta = want - lastShift 自然变大，会重新尝试推动
  // 仅记录"上次想要的方向"用于 UI 反馈（震动）
  drag.blockedAxis = drag.axis;
  drag.blockedDir = Math.sign(delta);
  navigator.vibrate?.(8);  // 轻触觉反馈
}
```

### A5：touchmove 首帧不 preventDefault
- `onPointerDown` 时即标记 `drag = {..., preventDefaultNext: true}`
- `onPointerMove` 入口立即 `if (e.cancelable && drag) e.preventDefault()`
- axis 判定仍按原逻辑，但防默认不再依赖 axis 确定

### A6：CELL_PX 硬编码
- 棋盘容器加 `data-pitch` 属性（CSS 算后写入）
- 启动时 + resize 时用 `getBoundingClientRect` 测一格中心距离
- 存入 `state.pitch`，动画函数读 `state.pitch` 而非常量
- 监听 `window.resize`（debounce 150ms）重测

### A7：胜利 overlay 无关闭
- overlay 加右上角"×"关闭按钮（aria-label="关闭"）
- 关闭后 overlay 隐藏但棋盘保留终局状态，玩家可滚动回看
- 加"📋 复制盘面"次要按钮（可选，先不做）
- 保留"再来一局"主按钮

### A8：hint 与自动消除冲突
- hint 找到 pair 后：
  - 若 pair 中任一方处于"自动消除候选"（targets.length===1）：先高亮 1.5s 再消除（给学习窗口）
  - 若 pair 是多目标场景下的某一组：只高亮，不自动消除
- hint 高亮期间任何新输入（点击/拖拽）立即取消高亮

---

## 6. 工程结构

```
pj_bricks/
├── index.html                    # 结构 + critical CSS + <script type="module">
├── server.js                     # 静态服务器（增加 css/js 路由）
├── styles.css                    # Claymorphism 设计令牌 + 组件样式
├── game/
│   ├── main.js                   # 启动入口
│   ├── board.js                  # 棋盘模型 + 连通性 + 死局判断 + 重排
│   ├── interaction.js            # 点击/拖拽/状态机/动画
│   ├── svg-icons.js              # 14 个漫画 SVG + 表情叠加
│   └── dialogs.js                # 死局/胜利/确认弹框管理
└── docs/superpowers/specs/2026-07-06-lianliankan-redesign-design.md
```

模块边界：
- `board.js` 导出纯函数：`createBoard`, `findSolvablePair`, `hasAnySolvablePair`, `reshuffle`, `applyShift`，无 DOM 依赖
- `interaction.js` 持有 `state`，调用 board.js 纯函数 + 操作 DOM
- `svg-icons.js` 导出 `ICONS: { broccoli: '<svg>...</svg>', ... }` 和 `withFace(svg, kind)`
- `dialogs.js` 导出 `showDeadlock(opts)`, `showGameOver(info)`, `showWin(info)`，返回 Promise<boolean>
- `main.js` 组装 + 绑定全局事件

---

## 7. 验证清单（实施完成后手测）

### 功能
- [ ] 开局必可解（连跑 20 次新局，无开局即死局）
- [ ] 单目标点击自动消除
- [ ] 多目标进入 waiting，点候选消除、点空白取消
- [ ] 拖拽推动多格连锁正确
- [ ] 拖到边界被阻，继续向同方向拖可再次尝试（A4）
- [ ] 拖动到无可消除 → 回滚动画
- [ ] 拖动到多目标 → waiting，点空白可回滚（A3）
- [ ] 死局首次 → 弹框 → 重排（deadlockCount=1）
- [ ] 死局二次 → 游戏结束弹框
- [ ] 放弃本局 → 完全重置
- [ ] 胜利 overlay 可关闭，可再来一局（A7）
- [ ] hint 高亮不被自动消除即时吞掉（A8）

### 视觉/交互
- [ ] 14 个 SVG 视觉可区分（盲测 10 次能秒认）
- [ ] 竖版 14×10 在 375/768/1440 三档不溢出
- [ ] 按压 scale 0.94 + spring，reduced-motion 下降级
- [ ] 弹框 backdrop 模糊 + scale 入场
- [ ] 选中态蔬菜有"眯眼笑"表情，消除瞬间"惊讶嘴"

### 工程
- [ ] `node server.js` 起在 3013，访问 `/` 加载完整游戏
- [ ] 浏览器 console 无报错
- [ ] DevTools Network 显示 css/JS 模块 200
- [ ] 拖动时无 layout shift（CLS ≈ 0）

---

## 8. 风险与权衡

| 风险 | 缓解 |
|---|---|
| Claymorphism 投影在低端机卡顿 | 投影用 `filter: drop-shadow` 单层而非多层 box-shadow；必要时降级 |
| Google Fonts 加载慢导致 FOIT | 用 `font-display: swap` + 系统字体后备 |
| 拖拽 `preventDefault` 影响 page scroll | 仅在 boardEl 上 touchstart 时设 drag，pointer up/outside 立即清 |
| 死局判断在 14×10 满盘时 O(N²) = 19600 次 isClearPath | 单次 < 1ms 可接受；不优化 |
| ES Modules 在 file:// 下不工作 | server.js 已就绪，文档说明必须通过 http 访问 |

---

## 9. 后续（本次不做）

- 计分 / 连击 / 关卡
- 撤销
- 音效
- 排行榜 / 存档（需后端）
- 1~2 折连线规则（如玩家反馈 0 折太严）
