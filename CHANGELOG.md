# 变更记录

## 2026-10-12 · 田园连连看 · Q版花园（提交 3108012，对应上游部署提交 1626ba3d）

大版本更新：目录结构重构 + 视觉全面替换 + 拖拽机制深化。

### 结构
- 源码从根目录 `game/` 重构为 `dist/` 布局（`dist/game/`、`dist/assets/`、`dist/licenses/`）
- `server.js` 改为独立静态服务器，静态根目录指向 `dist/`，端口仍为 3013
- 新增 `package.json`（`npm start` / `npm test`）、`TEST_RESULTS.txt` 打包前测试记录
- 移除 `.gitignore`、`CLAUDE.md`（随上游包内容同步；git 历史可找回）

### 视觉素材
- 角色图集替换为 20 个原创简洁 Q 版花园角色（`q-garden-clean-atlas.png`），SVG 指向方式经 `svg-icons.js` 切换
- 旧素材按"此前素材版本"保留：`q-garden-atlas.png`、`farm-icons.mjs`、`sticker-icons.mjs`
- 图标素材授权变化：Noto Emoji（Apache-2.0，墨影适配，南瓜去除万圣节表情）替代原 Fluent Emoji Flat（Microsoft, MIT，仅留在未使用的源模块中）；详见 `dist/licenses/NOTICE.txt`
- 附图集生成 prompt（`dist/assets/*.prompt.txt`）

### 玩法与机制
- 固定链（fixed chain）拖拽机制：链整体推移、不可越界、不可覆盖链外方块、拖动中不吸收后续元素、无匹配自动还原并带回滚动画
- 死锁深搜判定（`findSolvablePairDeep`）：覆盖滑动段深度的宏观搜索，修复多例玩家上报的死锁误判回归
- 消除衔接爆炸粒子特效（`burst-effects.js`），拖动松手立即判定并连续衔接；尊重 `prefers-reduced-motion`
- 难度渐进：逐步减少开局配对机会与辅助资源，重启时难度参数保持确定性
- 棋盘保持 10 列 × 14 行，针对 iPhone 15 Pro 竖屏调整大棋盘布局

### 质量
- 回归测试从旧版 9 个文件扩充到 99 项，全部通过（覆盖固定链推移、死锁深搜、爆炸特效 DOM、进度存档、关卡预算等）

### 运维登记
- 2026-10-12 部署到本服务器 PM2 `pj-bricks`，外网 `http://119.91.53.223:3013/` 验证通过
- 部署方式：上游交付 zip 全量同步（保留 `.git`），`npm test` 通过后 `pm2 restart`
