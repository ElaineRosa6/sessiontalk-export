---
name: SessionTalk Export 项目总结
description: Chrome 扩展项目，支持从智谱清言等 AI 对话平台导出对话为 Markdown/HTML
type: project
originSessionId: d54c439a-ce3a-4380-9f10-c4978a398e51
---
SessionTalk Export 是一个 Chrome 扩展（Manifest V3），支持从智谱清言 (chatglm.cn) 等 AI 对话平台导出历史对话。

**Why:** 用户需要将 AI 对话记录导出为本地文件（Markdown/HTML），支持单条导出、批量导出、合并导出。

**How to apply:** 
- 平台适配器模式 (`src/platforms/base.js` 定义接口，`chatglm.js` 实现)
- 新平台只需创建新的 adapter 实现 detect()/getConversationList()/getCurrentConversation()/scrollToLoadAll() 四个方法即可接入
- 批量导出通过 MutationObserver 注入钩子按钮，自动同步选中状态到 chrome.storage.local
