# 美术素材来源与授权

## 棋子贴图（game/icon-bodies.mjs）
- 形体来源：Fluent Emoji Flat（https://github.com/microsoft/fluentui-emoji）
- 授权：MIT License，Copyright (c) Microsoft Corporation
- 修改：项目按 CC0 选图页结论加工——叠加 OpenMoji 风格深棕描边层
  （#3D2B1F，线宽约画布 3.4%，圆角衔接），32→64 画布居中缩放
- 再生成：`node tools/apply-final-icons.mjs`

## 表情层（game/svg-icons.js 内 FACE_LAYERS）
- 项目自绘，随源码分发

## 历史
- v20260827n 曾整站采用 OpenMoji（CC BY-SA 4.0），v20260827q 起改为
  Fluent 形体 + 描边方案，OpenMoji 不再使用。
