# Web 实现

## 页面

- `#today`：最新版本、安装入口、本地状态和最近更新。
- `#archive`：搜索全部版本、选择版本生成短片、查看本地藏品。
- `#lab`：能力列表和本地设置。

页面使用 hash 路由，GitHub Pages 刷新时不需要服务端回退。

## 版本短片

[Remotion Player](https://www.remotion.dev/docs/player) 根据版本标题、日期、心情和荒诞度生成 8.7 秒短片。播放器点击后才加载；启用减少动态效果时只显示静态封面。

Remotion 使用专用许可证。个人、非营利组织和不超过三人的营利组织可按其免费条款使用；项目用途变化时需要重新检查[许可证](https://www.remotion.dev/license)。

## 聊天

- 本地：RiveScript 2.2.1 的项目规则，加上 410,009 组社区对话。KdConv、ChatterBot Corpus 和 XDailyDialog 按语言分片，需要时只加载对应语言；倒排索引先缩小候选，再做相似度重排。
- 匿名云端：用户主动选择后调用 AI Horde 的匿名公共接口；18 秒内没有结果会取消任务并回到本地。
- 账户云端：用户点击后加载 Puter.js，并使用其 Puter 账户额度。

AI Horde 的匿名请求会交给社区工作节点处理，繁忙时优先级最低。Puter 没有公开固定的每日免费次数，界面通过 `puter.auth.getMonthlyUsage()` 显示账户当月剩余比例。聊天不会写入版本账本或本地档案。

## 文案

界面先写结果，再写必要条件。项目自己的版本理由可以荒唐；操作说明保持短、直、具体。
