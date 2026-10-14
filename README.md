# 田园连连看 · 简洁 Q 版

当前在线版完整源码及素材（2026-10-13，用户验收通过）。游戏内容对应部署提交 `a925942325df2ec98df8c88ec917be17c4b8e347`。

## 快速运行

安装 Node.js 20 或更新版本。没有第三方依赖，无需 npm install 或编译。

```bash
cd pj_bricks
node server.js
```

电脑打开 `http://localhost:3013`。手机访问 `http://服务器IP:3013`，服务器防火墙/安全组需允许该端口。

自定义端口（Linux）：

```bash
PORT=8080 node server.js
```

## 目录

- `dist/index.html`：页面布局。
- `dist/styles.css`：大棋盘布局、第一版配色及动画。
- `dist/game/`：原生 JavaScript 源码，直接修改即可，无构建过程。
- `dist/assets/sprites/`：当前 20 个独立透明 PNG，清除相邻角色残留。
- `tools/export-sprites.cjs`：图案隔离导出工具（仅重新导出需要 sharp）。
- `CHANGELOG.md`、`docs/CHANGELOG.md`：完整修改记录与验收结果。
- `dist/assets/*.prompt.txt`：贴图生成说明。
- `tests/`：113 项自动回归测试。
- `server.js`：独立静态服务器，默认端口 3013，静态根目录为 dist。

原图集作为编辑源保留；当前角色由 `dist/game/svg-icons.js` 指向独立 PNG。

## 测试

```bash
npm test
```

或 `node --test tests/*.test.mjs`。打包前结果：113 项通过，记录见 TEST_RESULTS.txt。

## 用 Nginx 部署

也可以直接把 Nginx 的 root 指向 `pj_bricks/dist`，此时无需运行 Node 服务器。

```nginx
server {
    listen 80;
    server_name example.com;
    root /opt/pj_bricks/dist;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

资源使用 `/game/`、`/assets/` 等根路径，按站点根目录部署；若挂到子目录，应同步调整 HTML 和素材引用路径。

## 当前行为

- 10 列 × 14 行，针对 iPhone 15 Pro 竖屏调整的大棋盘。
- 拖动完整方块，松手立即判定并连续衔接爆炸动画。
- 推链不能越过棋盘边缘，也不能覆盖原推链以外的方块。
- 同图案沿直线且中间无阻挡时可消除；拖动后无匹配会还原。
- 多目标配对需要选择目标；难度逐步减少开局配对机会与辅助资源。
- 进度保存在浏览器 localStorage，换设备或域名不会自动同步。
- 素材和字体不依赖外部 CDN，无需登录或外部 API。

线上源项目包含 dist、tests、tools 和 docs；本包额外提供独立静态服务器、package.json 和启动说明。未包含托管平台配置、Git 元数据或凭据。

## 最新布局（2026-10-13 晚）

恢复满宽大棋盘；保留精简顶栏与整组垂直居中。393px 视口每格约 37.1px。较矮窗口允许自然滚动，避免格子缩小影响操作。

## 浏览器可视区域适配版（2026-10-13 21:49）

通过 visualViewport 读取页面实际可见高度，矮竖屏自动精简顶栏和进度条、移除空白提示行并将道具横排，保留满宽大格子。浏览器工具栏展开或收起时更新布局。将新包的完整 dist 覆盖到实际运行目录；Node 服务以 server.js 所在目录下的 dist 为静态根目录。

## 死局误判修复（2026-10-13）

修复纵向拖拽可达配对被漏判的问题，死局搜索与实际抓取棋子的拖动、松手配对规则统一。包含截图四块残局回归及随机残局回放测试；113 项通过。保留最新浏览器布局和素材。

## 死局全面核查版

独立模拟器对 360 个疏密不同盘面验证判定一致。修复重排忽略拖拽可达解的遗漏；详见 CHANGELOG 第 9 节。

## 最新版：边缘手势规避（2026-10-14）

触屏手机竖屏左右留边 16px，边缘有效方块触摸起点尝试取消默认动作。浏览器切页或失焦时还原未完成拖拽。保留浏览器高度适配与死局修复。此方案不能保证关闭浏览器原生手势，实际效果需手机复核。详见 CHANGELOG 第 10 节。
