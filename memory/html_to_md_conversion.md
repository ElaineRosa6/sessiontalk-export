---
name: html-to-md-conversion
description: AI 对话 HTML 转 Markdown 的转换器经验教训
type: feedback
originSessionId: d10297ce-ccf0-4285-b547-5718fc2e3c50
---
**HTML 转 Markdown 转换器经验**

Why: 首次转换时所有代码块语言标签丢失为 text，因为语言标签在 pre 的父级 div 上而非 pre 内部，且代码内容包含语法高亮 span 标签。

How to apply: 处理 ChatGLM 的 HTML 内容时必须先提取语言标签，再 strip HTML 标签获取纯代码。

**关键发现**:
- ChatGLM 代码块结构：`<div class="language language-X">` 包裹 `<pre><code>`，语言标签在父级 div 上
- class 可能有前缀如 `class="code-block language language-html"`，正则需用 `class="[^"]*\blanguage\s+language-([^"]*)"` 匹配
- 简化格式：`class="language-bash"` 单一 class 也需支持
- 空 language 时（`class="language language-"`）需从 `lang="xxx"` 属性获取
- 代码内容包含大量 `<span class="hljs-*">` 标签，必须 strip 后再作为代码块输出
- HTML 实体解码：`&lt;`、`&gt;`、`&amp;`、`&quot;`、`&#39;`、`&nbsp;`；`&amp;&amp;` 需额外解码为 `&&`
- 内联 `<code>` 内容也需解码 HTML 实体
- 转换前必须先移除 UI 元素：`.top-outer` 语言标签栏、`.mermaid-render`、`.sources-tab-container`、`.source-item`、SVG Icon 占位符
- 清理 "复制入框"、"复制"、"代码生成完成"、"{语言}代码" 等 widget 文本
- JS 字符串不可变：不能在函数内修改传入的字符串参数并期望外部看到变化，必须返回新字符串
- 有序列表 `<ol>` 的 `<li>` 需要逐个编号替换（1. 2. 3.），不能统一替换；嵌套 `<ol start="N">` 需从内到外处理
- 表格 `<table>` 转为 Markdown 需生成表头分隔行

**Thinking 区域代码块补充**（2026-05-11）:
- 智谱清言有时把完整代码放在 thinking 区域，最终回答只有 `.code-block` widget（"代码生成完成"）
- Widget 结构：`<div class="code-block el-tooltip__trigger">` 含标题和语言标签，无实际代码
- 平台适配器检测回答中没有代码块时，从 `text-advance-thinking-content` 区域提取代码块补充
