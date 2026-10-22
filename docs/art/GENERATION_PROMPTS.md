# 角色素材生成说明

使用内置图像生成工具。第 1 次生成 pixel-v2；第 2 次以该图为输入重绘 chibi-v3。当前游戏使用 chibi-v3，两个原始图集都保留。

## 当前重绘提示词

Preserve exact 5 column x 4 row layout and exact species order, transparent background and isolated characters. Redraw all characters into much more chibi, simple, round, cute cartoon monster game sprites. Remove excessive realistic produce texture. Oversized round head/body, large clear expressive eyes and tiny stubby paws, 1.5-head proportions, plump silhouette, a very large face. Short fat carrot, short chubby cucumber, pudgy banana. Thick consistent dark outlines. Only 3 or 4 clean flat color clusters per material, tiny simple highlight, one shade patch. No dithering, veins, mottling, wrinkles, realistic rendering or painterly brushwork. Original characters, not existing Pokemon. Diverse expressions, readable at 32x32. Transparent padding; no touching sprites, labels or scenery.

Species order: broccoli, lettuce, tomato, carrot, corn / eggplant, onion, potato, cucumber, green bell pepper / pumpkin, grapes, apple, strawberry, banana / orange, pear, cherries, peach, watermelon.

图集通过 tools/export-sprites.cjs 按透明度连通区域隔离，输出 20 个独立 160x160 PNG 与校验清单。


## 第 3 次：新旧融合 expressive-v4

输入：chibi-v3 图集，以及每组左旧右新的对照图。优先旧版表情与比例（80%），只保留新版轮廓与轻量明暗（20%）。保持 5列4行、透明背景、原物种顺序。大眼白配黑瞳孔、明显眉毛、非对称眼形、半睁眼和不同嘴形；不要统一黑豆眼或张嘴笑。简化卡通粗轮廓，单层阴影，禁止写实纹理。具体表情方向见 EXPRESSION_DIRECTION.md。使用内置图像生成工具。
