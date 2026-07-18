# Drag Animation Race Fix Design

**Date:** 2026-07-17

## Problem

快速连续拖动会重叠触发多轮 FLIP 动画。旧动画的 `requestAnimationFrame` 或清理定时器仍可能清除新动画写入的 `transform/transition`，导致中间方块短暂视觉消失；棋盘模型和 SVG 内容本身没有丢失。

## Design

新增 `game/move-animation.js` 管理移动动画生命周期：

- 每个格子保存当前动画 token、rAF ID 和清理 timer ID。
- 新动画接管格子时，取消该格子的旧 rAF 和 timer，并写入新 token。
- 所有异步回调执行前检查 token；旧回调失去所有权后不得修改格子样式。
- 当前动画结束后清理 inline `transform/transition` 和内部记录。
- 提供 `cancelAll()`，重新开局前取消全部遗留动画。

`game/interaction.js` 只把现有 `animateMoves()` 委托给该模块。棋盘、拖拽和匹配规则保持不变：松手后只检查最初按住的方块；单目标自动消除，多目标由玩家选择，无目标则回滚。

## Automated test

使用 Node 内置 `node:test`，不添加第三方依赖：

```bash
node --test tests/*.test.mjs
```

`tests/move-animation.test.mjs` 使用假格子和可控调度器覆盖：

- 旧动画回调不能覆盖同格子的新动画；
- 新动画会取消旧 rAF 和 timer；
- 不同格子的动画互不影响；
- 当前动画完成后正确清理；
- `cancelAll()` 能阻止重新开局后的遗留写入。

## Verification

```bash
node --test tests/*.test.mjs
node --check server.js
git diff --check
```

最后在浏览器快速连续拖动行和列，确认中间方块不再消失，且单目标、多目标和无效回滚行为不变。
