# 奖励广告适配器

当前没有接入任何真实广告平台。未注册适配器或广告不可用时，正式游戏不会显示广告按钮，也不会模拟广告成功。

宿主在真实 SDK 初始化成功后，通过 `/game/rewarded-ads.js` 的 `registerRewardedAdsProvider(provider)` 注册：

```js
import { registerRewardedAdsProvider } from '/game/rewarded-ads.js';
registerRewardedAdsProvider({
  isAvailable() { /* 同步返回真实 SDK 广告是否已准备好 */ },
  async show({ placement, levelNumber }) {
    // placement 固定为 deadlock-reshuffle。
    // 调用真实 SDK；应在广告关闭/失败时结算 Promise。
    // 仅 SDK 的 earned-reward 回调可将 rewarded 置为 true。
    // 用户取消、关闭但没赚取奖励、无填充、错误均返回 false 或抛错。
    return { rewarded: false };
  },
});
```

以上是接口说明，不是可发奖的广告实现。`isAvailable()` 必须同步返回布尔值；`show()` 必须在结束、取消或失败时完成，不能只依赖广告加载成功或播放器关闭事件认定奖励。SDK 的一次展示应只结算一次。

只有真死局且免费重排耗尽时才提供入口；每关每次尝试最多奖励一次，立即用于重排。并发点击只发起一次请求；已重试/切关的旧回调不影响新局。未完成广告可重新选择广告或重试本关。取消不会重置棋盘。

这里的道具只属于当前局内存状态；后续若扩展跨设备道具库存，需另接后端奖励凭据核验与幂等发放。尚未选择广告平台，也未添加 SDK、广告账号或网络请求。
