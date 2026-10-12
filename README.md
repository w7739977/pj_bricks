# 田园连连看 · 简洁 Q 版

当前在线版完整源码及素材（2026-10-12）。游戏内容对应部署提交 `1626ba3ddebfc421c56d67c26415fd5546c20dbf`。

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
- `dist/assets/q-garden-clean-atlas.png`：当前 20 个原创简洁 Q 版角色图集。
- `dist/assets/*.prompt.txt`：贴图生成说明。
- `tests/`：99 项自动回归测试。
- `server.js`：独立静态服务器，默认端口 3013，静态根目录为 dist。

其他图集和图标模块作为此前素材版本保留；当前角色由 `dist/game/svg-icons.js` 指向 `q-garden-clean-atlas.png`。

## 测试

```bash
npm test
```

或 `node --test tests/*.test.mjs`。打包前结果：99 项通过，记录见 TEST_RESULTS.txt。

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

线上源项目包含 dist 和 tests；本包额外提供独立静态服务器、package.json 和启动说明。未包含托管平台配置、Git 元数据或凭据。
