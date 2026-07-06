---
name: chrome-extension-architecture
description: Chrome 扩展项目的架构决策和设计经验
type: project
originSessionId: d10297ce-ccf0-4285-b547-5718fc2e3c50
---
**Chrome 扩展项目架构经验**（2026-05-11）

Why: 项目需要支持多 AI 平台导出，设计了可扩展的适配器模式。

How to apply: 后续扩展其他平台时遵循此架构。

**架构决策**:
- 采用**适配器模式**：每个平台实现 `BasePlatformAdapter` 接口，在 `PLATFORMS` 数组中注册
- **核心模块与平台解耦**：转换器（htmlToMd、htmlExporter）、下载器（downloader）完全平台无关
- **Content Script 注入按钮**：在页面右下角注入 📥 导出按钮，用户体验优于纯 Popup 操作
- **去除外部依赖**：原生 API 已满足需求，移除了 jszip/file-saver/turndown 依赖
- 导出格式优先支持 Markdown 和 HTML，不导出图片

**新平台接入流程**:
1. 创建 `xxxAdapter.js` 继承 `BasePlatformAdapter`
2. 实现 4 个方法：`detect()`、`scrollToLoadAll()`、`getConversationList()`、`getCurrentConversation()`
3. 在 `content/index.js` 的 `PLATFORMS` 数组中添加
4. 更新 `manifest.json` 的 `host_permissions` 和 `matches`

**多对话导出进度机制**（2026-05-11）:
- 问题：使用 `forEach` 同步触发所有对话导出，浏览器来不及处理，进度条卡在 0%
- 解决：改为 `for` 循环逐个 `await` 处理，每个对话处理后通过 `chrome.runtime.sendMessage` 发送 `EXPORT_PROGRESS` 进度更新
- Popup 通过 `bindProgressListener()` 监听进度消息，实时更新进度条
- 对话只有侧边栏元数据（无 messages）时，尝试点击侧边栏导航到该对话再提取
- 每个下载之间间隔 300ms 避免浏览器阻止连续下载
