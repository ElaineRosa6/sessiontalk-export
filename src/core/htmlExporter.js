import { escapeHtml, sanitizeHtml } from './sanitize.js';

const ROLE_MAP = {
  user: { cls: 'message-user', labelKey: 'authorName' },
  assistant: { cls: 'message-assistant', label: 'ChatGLM' },
  system: { cls: 'message-system', label: 'System' },
  tool: { cls: 'message-tool', label: 'Tool' }
};

function roleClass(role) {
  return (ROLE_MAP[role] || ROLE_MAP.assistant).cls;
}

function roleLabel(msg) {
  const entry = ROLE_MAP[msg.role] || ROLE_MAP.assistant;
  if (entry.labelKey) return msg[entry.labelKey] || '用户';
  return entry.label;
}

const EXPORT_CSS = `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; background: #fafafa; color: #333; line-height: 1.6; }
h1 { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 16px; }
h2 { margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; }
.meta { text-align: center; color: #999; font-size: 14px; margin-bottom: 32px; }
.message { margin-bottom: 24px; padding: 16px; border-radius: 8px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.message-user { border-left: 4px solid #1890ff; }
.message-assistant { border-left: 4px solid #52c41a; }
.message-system { border-left: 4px solid #faad14; }
.message-tool { border-left: 4px solid #722ed1; }
.message-role { font-weight: 600; margin-bottom: 8px; color: #666; font-size: 14px; }
.message-content { line-height: 1.8; }
.message-content pre { background: #f6f8fa; padding: 12px 16px; border-radius: 6px; overflow-x: auto; font-size: 14px; }
.message-content code { font-family: "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace; }
.message-content p code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.message-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.message-content th, .message-content td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
.message-content th { background: #f6f8fa; font-weight: 600; }
.message-content blockquote { border-left: 4px solid #e0e0e0; margin: 12px 0; padding: 8px 16px; color: #666; background: #f9f9f9; }
.message-content img { max-width: 100%; height: auto; }
.message-content hr { border: none; border-top: 2px solid #eee; margin: 24px 0; }
.separator { text-align: center; color: #ccc; margin: 40px 0; font-size: 20px; letter-spacing: 8px; }`;

/**
 * 将单条对话转为 HTML
 * @param {{title: string, timestamp: number, messages: Array<{role: string, authorName: string, contentHtml: string}>}} conversation
 * @returns {string}
 */
export function conversationToHtml(conversation) {
  const messagesHtml = conversation.messages.map(msg =>
    `<div class="message ${roleClass(msg.role)}">
  <div class="message-role">${escapeHtml(roleLabel(msg))}</div>
  <div class="message-content">${sanitizeHtml(msg.contentHtml)}</div>
</div>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(conversation.title)}</title>
<style>
${EXPORT_CSS}
</style>
</head>
<body>
<h1>${escapeHtml(conversation.title)}</h1>
<div class="meta">导出时间: ${new Date().toLocaleString('zh-CN')} | 共 ${conversation.messages.length} 轮对话</div>
<div class="messages">${messagesHtml}</div>
</body>
</html>`;
}

/**
 * 将多条对话合并为一个 HTML 文件
 * @param {{title: string, timestamp: number, messages: Array}[]} conversations
 * @param {string} exportTitle
 * @returns {string}
 */
export function mergeToHtml(conversations, exportTitle = '对话导出') {
  const allHtml = conversations.map(conv =>
    `<h2>${escapeHtml(conv.title)}</h2>\n<div class="messages">` +
    conv.messages.map(msg =>
      `<div class="message ${roleClass(msg.role)}">
  <div class="message-role">${escapeHtml(roleLabel(msg))}</div>
  <div class="message-content">${sanitizeHtml(msg.contentHtml)}</div>
</div>`
    ).join('\n') + '</div><div class="separator">• • •</div>'
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(exportTitle)}</title>
<style>
${EXPORT_CSS}
</style>
</head>
<body>
<h1>${escapeHtml(exportTitle)}</h1>
<div class="meta">导出时间: ${new Date().toLocaleString('zh-CN')} | 共 ${conversations.length} 个对话</div>
${allHtml}
</body>
</html>`;
}
