# 智谱清言 API 分析指南

## 分析目标

为了实现稳定的数据抓取，需要分析智谱清言网页版的：
1. 对话列表 API
2. 单条对话详情 API
3. 认证机制
4. DOM 结构（备选方案）

---

## 分析步骤

### 1. 打开开发者工具

1. 打开智谱清言网页 https://chatglm.cn
2. 按 `F12` 打开开发者工具
3. 切换到 **Network** 标签

### 2. 分析对话列表 API

**操作步骤**：
1. 刷新页面或滚动侧边栏对话列表
2. 在 Network 标签筛选 `XHR` 或 `Fetch` 请求
3. 查找包含对话列表数据的响应

**需要记录的信息**：

| 字段 | 值 | 说明 |
|------|-----|------|
| URL | `待分析` | API 端点地址 |
| Method | `待分析` | GET 或 POST |
| Request Headers | `待分析` | 特别是 Authorization 头 |
| Request Params | `待分析` | 分页参数等 |
| Response Structure | `待分析` | JSON 结构示例 |

**示例响应结构**（预期）：

```json
{
  "data": {
    "conversations": [
      {
        "id": "conv_xxx",
        "title": "对话标题",
        "created_at": 1234567890,
        "updated_at": 1234567890,
        "preview": "预览文本..."
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### 3. 分析单条对话详情 API

**操作步骤**：
1. 点击某条历史对话进入详情
2. 在 Network 标签查找新请求
3. 分析请求和响应结构

**需要记录的信息**：

| 字段 | 值 | 说明 |
|------|-----|------|
| URL | `待分析` | 对话详情端点 |
| Request Params | `待分析` | conversation_id |
| Response Structure | `待分析` | 消息列表结构 |

**示例响应结构**（预期）：

```json
{
  "data": {
    "id": "conv_xxx",
    "title": "对话标题",
    "messages": [
      {
        "role": "user",
        "content": "用户消息内容",
        "timestamp": 1234567890
      },
      {
        "role": "assistant",
        "content": "AI 回复内容",
        "timestamp": 1234567890,
        "model": "glm-4"
      }
    ]
  }
}
```

### 4. 分析认证机制

**需要确认**：
- Token 存储位置（localStorage / cookie / sessionStorage）
- 认证头格式（`Authorization: Bearer xxx`）
- Token 刷新机制

**分析方法**：
1. 在 **Application** 标签检查 Storage
2. 查看 localStorage 中的 token 相关字段
3. 检查请求 Headers 中的 Authorization

---

## DOM 结构分析（备选方案）

如果 API 方案不稳定，可以使用 DOM 解析作为备选。

**分析方法**：
1. 在 **Elements** 标签检查页面结构
2. 使用选择器定位关键元素
3. 记录 class 名称或 data 属性

### 需要定位的元素

| 元素 | 选择器示例 | 说明 |
|------|-----------|------|
| 对话列表容器 | `[class*="sidebar-list"]` | 侧边栏列表 |
| 单个对话项 | `[class*="chat-item"]` | 列表项 |
| 对话标题 | `[class*="title"]` | 标题文本 |
| 消息容器 | `[class*="message-list"]` | 消息区域 |
| 用户消息 | `[class*="user-message"]` | 用户消息标识 |
| AI 消息 | `[class*="assistant-message"]` | AI 消息标识 |
| 消息内容 | `[class*="content"]` | 消息文本 |

---

## 分析完成后

将分析结果更新到以下文件：

1. `src/content/index.js` - 更新 `SELECTORS` 常量
2. `src/content/modules/api-interceptor.js` - 更新 API URL 和参数

---

## 常见问题

### Q: API 请求返回 401/403？

可能是认证过期，需要刷新页面重新获取 token。

### Q: DOM 选择器失效？

智谱清言可能更新了前端，需要重新分析 DOM 结构。

### Q: 某些对话无法导出？

可能是对话类型特殊（如多模态对话），需要额外处理。