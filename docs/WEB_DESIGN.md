# Web 视觉与免费聊天设计

## 设计读法

Updated Again 是给喜欢“更新这件事本身”的人使用的活体软件。网页采用版本报纸、档案索引和工业压印机的混合语言：纸张承担长内容，黑色机器面板承担实时系统，黄色只表示正在发生或可以操作的事。

参考了三类公开案例，但没有复制模板源码：

- [Typographische Monatsblätter Research Archive](https://www.tm-research-archive.ch/) 的高密度档案索引思路。
- [Codrops Grid Item Animation Layout](https://tympanus.net/codrops/2015/04/15/grid-item-animation-layout/) 的杂志式网格和内容展开关系。
- [Codrops Creative Hub](https://tympanus.net/codrops/hub/) 对实验性网页、明确交互状态和开放演示的组织方式。

项目自己的更新账本、压印机资产、版本理由和回滚能力仍然是视觉与信息层级的来源；参考案例只影响版式判断。

## 版本幽灵路由

聊天按顺序自动尝试：

1. [Puter.js](https://docs.puter.com/AI/chat/)：不需要开发者 API Key，访客登录自己的 Puter 账户并使用自己的免费月度额度。
2. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)：满足浏览器和硬件条件时使用设备内置模型；初次使用可能下载模型。
3. 本地规则脑：不是大模型，但完全离线、确定可用，负责更新点子和项目人格回复。

界面始终显示实际命中的层和此前失败的层，不把规则回复伪装成云端 AI。聊天输入不会进入更新签名、GitHub Actions 或本地版本档案。

## 没有接入的服务

Pollinations 当前官方生成接口要求 API Key 或 BYOP OAuth 授权，旧的匿名无 Key 调用不再是可靠接口。Gemini、Groq、OpenRouter 等免费层同样需要不能安全公开的开发者凭证；在没有独立代理、预算上限和滥用隔离前，不把它们放进公开静态网页。
