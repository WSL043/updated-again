# Updated Again · 又更了

> 一个为了更新而更新、每天都真实改变一点点的活体软件项目。

[在线体验](https://wsl043.github.io/updated-again/) · [版本账本](https://wsl043.github.io/updated-again/feed/index.json) · [提出荒唐更新](https://github.com/WSL043/updated-again/issues/new?template=update-idea.yml)

Updated Again 不是包管理器，也不抓取其他项目的更新。用户来这里，就是为了等待这个项目自己再次更新。

每个更新理由可以不正经——“作者今天心情好”“按钮觉得自己很孤独”“天空少一颗星”——但更新包必须包含真实、可验证、可回滚的本地变化。所有版本都会进入只追加的版本博物馆。

## 它现在真的会做什么

- 每天由 GitHub Actions 在五个错峰时段运行，受约束随机算法决定今天发布 1～3 次。
- 若真正的 Core 功能版已经发布，它会计入当天更新，原定日更可能被推迟或取消。
- 最后一个时段承担保底；若调度曾中断，下一次运行会为缺失日期生成并发布储备胶囊。
- 胶囊使用 Ed25519 签名，客户端安装前同时验证签名和内容哈希。
- Web、PWA 和 Tauri 桌面客户端共用同一本更新账本和能力注册表。
- 每次安装都会保存本地快照，可回滚最后一次胶囊更新。
- Windows、Linux、macOS Apple Silicon、macOS Intel 都有独立 CI 检查；发布标签会生成签名桌面包。

这能做到“最终账本每天至少一更”，但不能把第三方托管平台故障描述成数学意义上的实时保证。仓库使用多个错峰调度、末班保底和断档回填来降低风险；如果需要严格 SLA，应把同一幂等调度器接到第二个独立 Cron 服务。

## 两条时间线

| 时间线 | 版本示例 | 谁可以发布 | 用途 |
|---|---|---|---|
| Daily Capsule | `D-20260814-0001-museum-object` | 规则引擎自动发布 | 主题、文案、藏品、仪式、伙伴状态、星图、按钮人格 |
| Core Release | `v0.2.0-1` | 代码审查和跨平台 CI 后发布 | 新玩法、新权限、新更新类型、迁移、更新器自身 |

Agent 可以生成理由、台词、参数和新配方 PR，但不持有签名密钥，也不能直接增加原生权限或发布任意代码。没有 Agent 时，确定性配方引擎和储备池仍能维持项目。

## 当前能力

- `theme`：改变世界调色板和宣言
- `message`：安装并归档一句新文案
- `collectible`：投放唯一版本藏品
- `ritual`：增加一项无用小仪式
- `companion`：改变补丁团子的样子、心情和台词
- `constellation`：在版本星图中钉上一颗星
- `button-personality`：改变更新按钮的文案和运动性格

增加配方只需编辑 [`content/recipes.json`](content/recipes.json)。增加全新能力必须同时实现生成、校验、应用、可见效果、回滚和测试；详见 [`docs/ADDING_UPDATE_TYPES.md`](docs/ADDING_UPDATE_TYPES.md)。

## 本地运行

需要 Node.js 22、pnpm 10；桌面构建还需要 Rust 和各平台的 Tauri 系统依赖。

```bash
pnpm install
pnpm dev
```

验证全部 Web 和更新协议：

```bash
pnpm check
```

模拟但不写入一次未来更新：

```bash
pnpm update:simulate
```

运行桌面版：

```bash
pnpm tauri:dev
```

生产日更需要 CI Secret `CAPSULE_SIGNING_PRIVATE_KEY` 和 `CHAOS_SEED`。不要把私钥写进 `.env`、Issue、日志或提交。

## 平台边界

| 平台 | 当前交付 |
|---|---|
| Web | GitHub Pages 自动部署 |
| 手机和平板 | 响应式 PWA，可添加到主屏幕 |
| Windows x64 | Tauri NSIS/MSI 开发者预览构建 |
| Linux x64 | Tauri AppImage/deb/rpm 开发者预览构建 |
| macOS Apple Silicon | Tauri DMG/app 开发者预览构建 |
| macOS Intel | 独立 Intel CI 构建 |
| iOS/Android 原生商店包 | 暂不宣称；需要开发者账号、设备验收和商店签名 |

目前桌面产物使用项目级更新签名，但没有付费的 Apple Developer ID 或 Windows Authenticode 证书，系统可能显示未知开发者警告。CI 成功也不等于真实设备支持，未经真实设备安装、更新、回滚和卸载验收前，所有原生包都标为 Developer Preview。

## 目录

```text
src/                 Web/PWA 与桌面共享界面
src/capabilities/    胶囊能力注册表和回滚边界
src/core/            协议、签名、存储、更新客户端
content/             无代码配方
scripts/             随机计划、发布、签名、账本验证
public/feed/         公共只追加账本和核心更新指针
public/updates/      不可变胶囊
src-tauri/           跨平台桌面外壳
.github/workflows/   CI、日更、Pages、核心发布
```

详细设计见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 和 [`docs/DAILY_RELEASE_CONTRACT.md`](docs/DAILY_RELEASE_CONTRACT.md)。

## 状态

`v0.1.1-1` 是公开开发者预览，不是稳定版。数字预发布标识兼容 MSI 的版本约束；项目故意不会急着宣布 `1.0`，但“不完成”不意味着可以跳过安全、真实性或回滚。

MIT License
