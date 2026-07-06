---
name: chatglm-dom-extraction
description: ChatGLM 网页对话提取的关键 DOM 结构和注意事项
type: project
originSessionId: d10297ce-ccf0-4285-b547-5718fc2e3c50
---
**ChatGLM DOM 结构提取经验**（2026-05-10 验证）

Why: 智谱清言使用虚拟 DOM + 懒加载，DOM 结构特殊，多次尝试才找到正确提取方式。

How to apply: 后续提取或开发新平台适配器时参考以下结构。

**关键 DOM 结构**:
- 对话项容器: `.item.conversation-item`
- 用户问题区: `.conversation.question` → `.question-txt`（文本在嵌套 div 中，需处理深度）
- 用户名: `.user-name`
- AI 回答区: `[class*="answer-content-wrap"]`（需排除 `[class*="text-advance-thinking"]`）
- 代码块: `<div class="language language-go">` 包裹 `<pre class="hljs"><code>...</code></pre>`，语言标签在 pre 父级 div 上，不在 pre 内部
- 代码内容: pre/code 内部有语法高亮 span（如 `<span class="hljs-keyword">`），需 strip 掉
- mermaid 图: `<div class="mermaid-render">`，但内容被 JS 渲染为 `[SVG Icon]` 占位符，静态 HTML 无法提取

**提取注意事项**:
- 必须滚动到页面底部再滚回顶部，触发虚拟 DOM 加载
- 用户问题文本可能被多个嵌套 div 包裹，不能简单用 `</div>` 分割
- `chrome_javascript` MCP 会拦截包含 cookie/query string 模式的返回值，需用 `chrome_get_web_content` 或先 sanitize 再返回
- 图片分两种：data URI base64（可提取保存）和 URL（保留链接）
