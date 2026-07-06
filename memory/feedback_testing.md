---
name: 扩展测试反馈
description: 用户对扩展测试时的反馈要点
type: feedback
originSessionId: d54c439a-ce3a-4380-9f10-c4978a398e51
---
1. 弹出窗口卡住问题：CSS `display: flex` 会覆盖 HTML `hidden` 属性，导致进度弹窗始终可见。解决方案是用 `display: none` 配合 `:not([hidden])` 选择器。
2. 批量导出按钮样式：注入的按钮必须使用内联样式（`style.cssText`），因为 Vue scoped CSS 的 `data-v-*` 属性会导致外部注入元素获得错误的灰褐色背景。
3. 导出文件命名：应使用对话标题而非导出日期，否则批量导出时文件名大量重复。
4. 自动同步优于手动加载：批量模式下勾选对话应自动同步到 popup，无需用户手动点击"加载到插件"。

**Why:** 这些都是实际测试中暴露的问题，CSS优先级、Vue scoped CSS、用户体验细节。
**How to apply:** 在修改 Chrome 扩展 UI 时参考这些教训。
