# 代码审计报告

**日期**: 2026-05-11
**项目**: 智谱清言对话导出 Chrome 扩展 (sessiontalk_export)
**文件数**: 12 个源文件（约 850 行核心代码）
**技术栈**: JavaScript (ES Modules) + Chrome Extension Manifest V3 + Webpack

---

## 🚨 严重问题（必须修复）

### 1. Blob URL 内存泄漏
- **文件**: `src/core/downloader.js:50`
- **问题**: `downloadViaChromeApi` 创建 Blob URL 后永远不调用 `URL.revokeObjectURL`
- **风险**: 批量导出时内存持续增长，最终导致浏览器崩溃
- **修复建议**: 在 Service Worker 下载完成后延迟释放 Blob URL

```js
// downloader.js:50 之后添加
setTimeout(() => URL.revokeObjectURL(url), 5000);
```

### 2. HTML 导出 XSS 注入
- **文件**: `src/core/htmlExporter.js:17`, `:70`
- **问题**: `${msg.contentHtml}` 原样注入 HTML，未过滤 `<script>`、`<iframe>`、`on*` 事件等
- **风险**: 如果平台返回恶意 HTML 或页面被注入内容，导出的 HTML 文件打开时会执行恶意脚本
- **修复建议**: 导出前对 HTML 进行净化

```js
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
}

// conversationToHtml 中：
<div class="message-content">${sanitizeHtml(msg.contentHtml)}</div>
```

### 3. downloadFile 的 revokeObjectURL 过早调用
- **文件**: `src/core/downloader.js:31-33`
- **问题**: `a.click()` 后立即 `URL.revokeObjectURL(url)`，但下载启动是异步的
- **风险**: 浏览器尚未读取 Blob 数据就已被销毁，导致下载空文件或失败
- **修复建议**: 延迟 1500ms 后再释放

```js
a.click();
document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 1500);
```

---

## ⚠️ 高优先级问题（大概率触发 Bug）

### 4. 滚动检测自身比较 Bug
- **文件**: `src/platforms/chatglm.js:61`
- **问题**: `newHeight` 赋值后立即与自身比较，永远为 true。实际意图是比较滚动前后的 scrollHeight
- **风险**: 滚动到底部的判断失效，无法正确检测是否加载完全部历史
- **修复建议**: 记录 `prevHeight`，与新值比较

```js
let prevHeight = scrollEl.scrollHeight;
scrollEl.scrollTop = scrollEl.scrollHeight;
await this.sleep(1500);

let attempts = 0;
while (attempts < maxAttempts) {
  const newHeight = scrollEl.scrollHeight;
  if (newHeight === prevHeight) {
    scrollEl.scrollTop = scrollEl.scrollHeight;
    await this.sleep(800);
    if (scrollEl.scrollHeight === prevHeight) break;
  } else {
    prevHeight = newHeight;
  }
  attempts++;
}
```

### 5. 消息处理缺少空值防护
- **文件**: `src/content/index.js:265`
- **问题**: 解构 `message.data` 时若为 undefined 则直接崩溃
- **风险**: Content Script 整体崩溃，所有导出功能失效
- **修复建议**: 增加空值校验

```js
case 'EXPORT_CONVERSATIONS': {
  if (!message.data) {
    sendResponse({ success: false, error: '缺少请求数据' });
    break;
  }
  const { conversations, format, merge } = message.data;
  if (!conversations || !Array.isArray(conversations)) {
    sendResponse({ success: false, error: 'conversations 必须是非空数组' });
    break;
  }
  // ...
}
```

### 6. _escapeHtml 未转义单引号
- **文件**: `src/platforms/chatglm.js:288-292`
- **问题**: HTML 转义缺少对 `'` 的处理
- **风险**: 在 HTML 属性上下文中可能破坏边界
- **修复建议**: 补充 `.replace(/'/g, '&#39;')`

### 7. 侧边栏对话 ID 不唯一
- **文件**: `src/platforms/chatglm.js:90`
- **问题**: `conv_${conversations.length}_${Date.now()}` 同毫秒内多次调用会重复
- **风险**: Set 去重失效，批量导出时选错或漏选对话
- **修复建议**: 改用 `crypto.randomUUID()`

```js
conversations.push({
  id: `conv_${crypto.randomUUID()}`,
  title,
  timestamp: Date.now(),
  preview: title.substring(0, 30)
});
```

---

## 💡 中优先级问题（逻辑不严谨 / 一致性隐患）

### 8. Turndown 死代码
- **文件**: `src/lib/turndown.min.js`
- **问题**: 引入但未使用，增加构建体积约 25KB
- **修复建议**: 移除文件及 webpack 中对应的 copy 配置

### 9. getCurrentConversation 的 fallback ID 不唯一
- **文件**: `src/platforms/chatglm.js:141`
- **问题**: `chatglm_${Date.now()}` 快速点击时可能重复
- **修复建议**: 加随机后缀 `_${Math.random().toString(36).slice(2, 8)}`

### 10. extractCodeBlocks 无法处理嵌套 <pre>
- **文件**: `src/core/htmlToMd.js:208`
- **问题**: `indexOf('</pre>')` 会在第一个闭合处截断
- **修复建议**: 用计数器追踪嵌套层级

### 11. extractCodeBlocks 性能 O(n²)
- **文件**: `src/core/htmlToMd.js:154-242`
- **问题**: while 循环内每次对子串执行多个正则匹配
- **修复建议**: 改用 `matchAll` 或 DOMParser

### 12. 滚动容器可能不对
- **文件**: `src/platforms/chatglm.js:46`
- **问题**: 滚动的是聊天消息容器，不是侧边栏历史列表容器
- **风险**: 批量导出时只获取到当前可见的几条对话
- **修复建议**: 区分"滚动加载消息"和"滚动加载历史列表"

### 13. roleClass 对未知 role 无降级
- **文件**: `src/core/htmlExporter.js:13`
- **问题**: 三元表达式会将 `system`/`tool` 等未知角色归类为 `message-assistant`
- **修复建议**: 增加映射表或默认分支

---

## 📝 低优先级问题（规范 / 可读性）

### 14. _escapeHtml 重复实现
- **位置**: `htmlExporter.js:111` 和 `chatglm.js:287` 完全相同
- **修复建议**: 提取到共享工具模块

### 15. HTML 导出 CSS 重复
- **位置**: `htmlExporter.js` 两个函数的 `<style>` 完全重复（约 20 行）
- **修复建议**: 提取为模板变量

### 16. host_permissions 范围过大
- **位置**: `src/manifest.json:31-36`
- **问题**: `*.chatglm.cn` 通配符子域名权限非必需
- **修复建议**: 移除通配符，仅保留 `chatglm.cn/*`

### 17. injectExportButton 从未被调用
- **位置**: `src/content/index.js:286-361`
- **修复建议**: 添加注释说明用途或移除

---

## 审查总结

**整体质量评估：中等偏上**

代码架构清晰（平台适配器模式 + 核心转换器 + 扩展三件套），模块化程度良好，测试覆盖有一定基础。主要问题集中在：

1. **资源管理不当** — Blob URL 泄漏 + revoke 时机过早，批量场景下同时出现内存增长和下载失败
2. **输入边界防护薄弱** — HTML 导出无净化 + 消息数据无空值校验 + 单引号未转义
3. **关键逻辑存在低级错误** — 滚动检测自身比较 + 伪随机 ID 生成

**最核心的修改方向**：优先修复 Blob URL 生命周期管理、增加 HTML 净化层、修复滚动检测逻辑、统一消息处理的空值防护。四个修复可覆盖 80% 的严重/高优先级问题。
