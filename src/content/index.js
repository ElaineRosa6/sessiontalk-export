/**
 * 对话导出助手 - Content Script 入口
 * 职责：平台检测、内容提取、格式转换、文件下载
 */

import { ChatGLMAdapter } from '../platforms/chatglm.js';
import { htmlToMarkdown } from '../core/htmlToMd.js';
import { conversationToHtml, mergeToHtml } from '../core/htmlExporter.js';
import { downloadFile, datedFilename, safeFilename } from '../core/downloader.js';

console.log('[SessionTalk] Content script 已加载, 当前页面:', window.location.href);

// ========== 平台注册 ==========
const PLATFORMS = [
  ChatGLMAdapter
  // 未来添加其他平台：
  // KimiAdapter,
  // DoubaoAdapter,
  // ...
];

/**
 * 检测当前页面对应的平台
 * @returns {ChatGLMAdapter|null}
 */
function detectPlatform() {
  for (const Adapter of PLATFORMS) {
    const adapter = new Adapter();
    if (adapter.detect()) {
      return adapter;
    }
  }
  return null;
}

// ========== 导出核心逻辑 ==========

/**
 * 提取当前页面的完整对话
 * @param {ChatGLMAdapter} platform
 * @returns {Promise<Object>}
 */
async function extractConversation(platform) {
  // 先滚动加载全部内容
  await platform.scrollToLoadAll();
  // 再提取
  return platform.getCurrentConversation();
}

/**
 * 将对话转为指定格式
 * @param {Object} conversation
 * @param {'markdown'|'html'} format
 * @returns {string}
 */
function convertConversation(conversation, format) {
  if (format === 'html') {
    return conversationToHtml(conversation);
  }

  // Markdown 格式
  const lines = [
    `# ${conversation.title}`,
    '',
    `> 导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `> 对话数: ${conversation.messages.length} 轮`,
    '',
    '---',
    ''
  ];

  conversation.messages.forEach(msg => {
    const roleLabel = msg.role === 'user' ? msg.authorName : 'ChatGLM';
    let contentMd = '';

    if (msg.role === 'user') {
      // 用户消息通常是纯文本
      contentMd = msg.contentHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    } else {
      // AI 消息包含完整 HTML，需要转换
      contentMd = htmlToMarkdown(msg.contentHtml);
    }

    lines.push(`**${roleLabel}**: ${contentMd}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 导出当前页面的单条对话
 * @param {string} format - 'markdown' 或 'html'
 */
function notifyError(message) {
  chrome.runtime.sendMessage({
    type: 'EXPORT_ERROR',
    data: { message }
  }).catch(() => {});
}

async function exportCurrentConversation(format = 'markdown') {
  const platform = detectPlatform();
  if (!platform) {
    notifyError('未检测到支持的 AI 平台');
    throw new Error('未检测到支持的 AI 平台');
  }

  const conversation = await extractConversation(platform);
  if (conversation.messages.length === 0) {
    notifyError('未找到对话内容');
    throw new Error('未找到对话内容');
  }

  const content = convertConversation(conversation, format);
  const ext = format === 'html' ? 'html' : 'md';
  const filename = datedFilename(conversation.title, ext);
  downloadFile(content, filename);
}

/**
 * 导航到指定对话（通过点击侧边栏项）
 * @param {number} index - 对话在列表中的索引
 * @returns {Promise<boolean>}
 */
async function navigateToConversation(index) {
  const items = document.querySelectorAll('.item.conversation-item, [class*="history-item"], [class*="conversation-item"]');
  if (index < 0 || index >= items.length) return false;

  // 点击侧边栏或主区域的对话项
  items[index].click();
  // 等待页面加载新对话内容
  await sleep(1500);
  return true;
}

/**
 * 导出当前页面的单条对话（合并模式）
 * @param {Object[]} conversations
 * @param {string} format
 * @param {boolean} merge
 * @param {function} [onProgress] - 进度回调 (current, total, conversation)
 */
async function exportConversations(conversations, format = 'markdown', merge = false, onProgress = null) {
  const platform = detectPlatform();
  if (!platform) {
    throw new Error('未检测到支持的 AI 平台');
  }

  // 先滚动加载全部对话
  if (onProgress) onProgress(0, conversations.length, '加载对话列表...');
  await platform.scrollToLoadAll();
  await sleep(500);

  try {
    if (merge) {
      // 合并导出：逐个导航、提取、合并
      const allConversations = [];
      for (let i = 0; i < conversations.length; i++) {
        if (onProgress) onProgress(i, conversations.length, `正在提取: ${conversations[i].title}`);

        const conv = conversations[i];
        if (!conv.messages || conv.messages.length === 0) {
          // 这是从侧边栏获取的元数据，需要先点击该对话
          // 尝试通过侧边栏导航
          const navOk = await navigateToConversation(i);
          if (!navOk) continue;

          // 重新提取
          const fullConv = await extractConversation(platform);
          allConversations.push(fullConv);
        } else {
          allConversations.push(conv);
        }

        // 下载之间留出时间
        if (i < conversations.length - 1) {
          await sleep(300);
        }
      }

      let content;
      if (format === 'html') {
        content = mergeToHtml(allConversations, '对话导出');
      } else {
        const parts = allConversations.map(conv => convertConversation(conv, format));
        content = parts.join('\n\n---\n\n');
      }
      const ext = format === 'html' ? 'html' : 'md';
      const filename = datedFilename('对话导出', ext);
      downloadFile(content, filename);
    } else {
      // 分开导出：逐个处理
      for (let i = 0; i < conversations.length; i++) {
        if (onProgress) onProgress(i, conversations.length, `正在处理: ${conversations[i].title}`);

        const conv = conversations[i];
        let fullConv = conv;

        if (!conv.messages || conv.messages.length === 0) {
          const navOk = await navigateToConversation(i);
          if (!navOk) continue;

          fullConv = await extractConversation(platform);
        }

        const content = convertConversation(fullConv, format);
        const ext = format === 'html' ? 'html' : 'md';
        const filename = datedFilename(conv.title, ext);
        downloadFile(content, filename);

        if (i < conversations.length - 1) {
          await sleep(300);
        }
      }
      if (onProgress) onProgress(conversations.length, conversations.length, '完成');
    }
  } catch (err) {
    console.error('批量导出失败:', err);
    throw err;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 消息监听 ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'DETECT_PLATFORM': {
      const platform = detectPlatform();
      sendResponse({
        success: true,
        platform: platform ? platform.info : null
      });
      break;
    }

    case 'GET_CONVERSATION_LIST': {
      const platform = detectPlatform();
      if (!platform) {
        sendResponse({ success: false, error: '未检测到支持的平台' });
      } else {
        try {
          const list = platform.getConversationList();
          sendResponse({ success: true, data: list });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      }
      break;
    }

    case 'EXPORT_CURRENT': {
      const format = message.data?.format || 'markdown';
      exportCurrentConversation(format).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // 保持消息通道（异步）
    }

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
      // 通过 runtime 发送进度更新，popup 可以监听
      const progressHandler = (current, total, statusText) => {
        chrome.runtime.sendMessage({
          type: 'EXPORT_PROGRESS',
          data: { current, total, percent: total > 0 ? Math.round((current / total) * 100) : 0, statusText }
        }).catch(() => {}); // 忽略可能的错误（popup 可能已关闭）
      };

      exportConversations(conversations, format, merge, progressHandler).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  }
});

// ========== 注入导出按钮 ==========
// 在支持的 AI 平台页面上注入浮动导出按钮，方便用户快速导出当前对话

function injectExportButton() {
  const existing = document.getElementById('sessiontalk-export-btn');
  if (existing) return;

  const platform = detectPlatform();
  if (!platform) return;

  const btn = document.createElement('button');
  btn.id = 'sessiontalk-export-btn';
  btn.textContent = '📥 导出';
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    padding: 10px 20px; border: none; border-radius: 8px;
    background: #1890ff; color: #fff; font-size: 14px;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;

  const menu = document.createElement('div');
  menu.id = 'sessiontalk-export-menu';
  menu.style.cssText = `
    position: fixed; bottom: 70px; right: 20px; z-index: 9999;
    background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    padding: 8px 0; display: none; min-width: 160px;
  `;

  const items = [
    { label: '导出为 Markdown', format: 'markdown' },
    { label: '导出为 HTML', format: 'html' }
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.textContent = item.label;
    el.style.cssText = `
      padding: 10px 16px; cursor: pointer; font-size: 14px; color: #333;
    `;
    el.onmouseenter = () => el.style.background = '#f5f5f5';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = async () => {
      menu.style.display = 'none';
      btn.textContent = '⏳ 导出中...';
      btn.style.background = '#999';
      try {
        await exportCurrentConversation(item.format);
        btn.textContent = '✅ 完成';
        btn.style.background = '#52c41a';
        setTimeout(() => {
          btn.textContent = '📥 导出';
          btn.style.background = '#1890ff';
        }, 2000);
      } catch (err) {
        btn.textContent = '❌ 失败';
        btn.style.background = '#ff4d4f';
        setTimeout(() => {
          btn.textContent = '📥 导出';
          btn.style.background = '#1890ff';
        }, 2000);
      }
    };
    menu.appendChild(el);
  });

  btn.onclick = () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };

  document.body.appendChild(btn);
  document.body.appendChild(menu);

  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
}

// ========== 批量操作导出钩子 ==========

let batchExportObserver = null;

function injectBatchExportHook() {
  if (batchExportObserver) return;

  batchExportObserver = new MutationObserver(() => {
    const existingBtn = document.getElementById('sessiontalk-batch-export-btn');
    const deleteBtn = findBatchDeleteButton();
    if (!deleteBtn || existingBtn) return;

    const toolbar = deleteBtn.parentElement;
    if (!toolbar) return;

    injectExportIntoBatchToolbar(toolbar);

    // 设置一个定时器持续检查（因为 Vue 可能重新渲染移除按钮）
    const checkInterval = setInterval(() => {
      if (!document.getElementById('sessiontalk-batch-export-btn')) {
        const db = findBatchDeleteButton();
        if (db && db.parentElement) {
          injectExportIntoBatchToolbar(db.parentElement);
        } else {
          clearInterval(checkInterval);
        }
      }
      if (!findBatchDeleteButton()) {
        clearInterval(checkInterval);
      }
    }, 1000);
  });

  batchExportObserver.observe(document.body, { childList: true, subtree: true });
}

function findBatchDeleteButton() {
  const allBtns = document.querySelectorAll('div.btn');
  for (const btn of allBtns) {
    if (btn.textContent.trim() === '删除') return btn;
  }
  return null;
}

function injectExportIntoBatchToolbar(toolbar) {
  if (document.getElementById('sessiontalk-batch-export-btn')) return;

  const deleteBtn = toolbar.querySelector('.btn.delete');
  const cancelBtn = toolbar.querySelector('.btn.cancel');

  const vAttrs = {};
  const refBtn = cancelBtn || deleteBtn;
  if (refBtn) {
    for (const attr of refBtn.attributes) {
      if (attr.name.startsWith('data-v-')) {
        vAttrs[attr.name] = attr.value;
      }
    }
  }

  const exportBtn = document.createElement('div');
  exportBtn.id = 'sessiontalk-batch-export-btn';
  exportBtn.className = 'btn';
  exportBtn.textContent = '导出';
  exportBtn.style.cssText = 'background:#1890ff;color:#fff;font-weight:500;cursor:pointer;';
  for (const [key, value] of Object.entries(vAttrs)) {
    exportBtn.setAttribute(key, value);
  }
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleBatchExport();
  });

  if (deleteBtn) {
    toolbar.insertBefore(exportBtn, deleteBtn);
  } else {
    toolbar.appendChild(exportBtn);
  }

  // 启动自动同步：监听批量模式下勾选变化，同步到 storage
  startBatchSelectionSync();
}

function startBatchSelectionSync() {
  if (document.getElementById('sessiontalk-batch-sync-active')) return;
  const marker = document.createElement('div');
  marker.id = 'sessiontalk-batch-sync-active';
  marker.style.display = 'none';
  document.body.appendChild(marker);

  let lastCheckedCount = 0;
  const syncInterval = setInterval(() => {
    // 检查是否仍在批量模式
    if (!findBatchDeleteButton()) {
      clearInterval(syncInterval);
      marker.remove();
      return;
    }

    const checkedItems = document.querySelectorAll('.item-checkbox.checked');
    if (checkedItems.length !== lastCheckedCount) {
      lastCheckedCount = checkedItems.length;
      saveBatchSelection(checkedItems);
    }
  }, 500);
}

function saveBatchSelection(checkboxes) {
  const conversations = [];
  checkboxes.forEach(checkbox => {
    const convItem = checkbox.closest('[class*="history-item"]') ||
                     checkbox.closest('[class*="conversation"]') ||
                     checkbox.parentElement;
    if (convItem) {
      const titleEl = convItem.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '未命名对话';
      conversations.push({
        id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        timestamp: Date.now()
      });
    }
  });

  chrome.storage.local.set({
    batchSelection: {
      conversations,
      timestamp: Date.now()
    }
  }).catch(() => {});
}

async function handleBatchExport() {
  const checkedItems = document.querySelectorAll('.item-checkbox.checked');
  if (checkedItems.length === 0) {
    notifyError('请先选择要导出的对话');
    return;
  }

  const platform = detectPlatform();
  if (!platform) {
    notifyError('未检测到支持的 AI 平台');
    return;
  }

  // 收集选中对话的元数据
  const selectedConversations = [];
  checkedItems.forEach(checkbox => {
    const convItem = checkbox.closest('[class*="history-item"]') ||
                     checkbox.closest('[class*="conversation"]') ||
                     checkbox.parentElement;
    if (convItem) {
      const titleEl = convItem.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '未命名对话';
      selectedConversations.push({
        id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        timestamp: Date.now()
      });
    }
  });

  if (selectedConversations.length === 0) {
    notifyError('未能获取选中对话信息');
    return;
  }

  // 点击取消退出批量模式
  const cancelBtn = document.querySelector('div.btn.cancel');
  if (cancelBtn) cancelBtn.click();
  await sleep(1000);

  // 获取侧边栏列表用来导航
  const historyItems = document.querySelectorAll('[class*="history-item"]');
  const conversationList = platform.getConversationList();

  // 逐条导出
  for (let i = 0; i < selectedConversations.length; i++) {
    const sel = selectedConversations[i];

    chrome.runtime.sendMessage({
      type: 'EXPORT_PROGRESS',
      data: { current: i, total: selectedConversations.length, percent: Math.round((i / selectedConversations.length) * 100), statusText: `正在导出: ${sel.title}` }
    }).catch(() => {});

    try {
      // 在侧边栏中找到并点击对应对话
      const idx = conversationList.findIndex(c => c.title === sel.title);
      if (idx >= 0 && idx < historyItems.length) {
        historyItems[idx].click();
        await sleep(2000);

        const conv = await extractConversation(platform);
        if (conv && conv.messages.length > 0) {
          const content = convertConversation(conv, 'markdown');
          const filename = safeFilename(conv.title, 'md');
          downloadFile(content, filename);
          await sleep(500);
        }
      }
    } catch (err) {
      console.error(`导出 ${sel.title} 失败:`, err);
    }
  }

  chrome.runtime.sendMessage({
    type: 'EXPORT_PROGRESS',
    data: { current: selectedConversations.length, total: selectedConversations.length, percent: 100, statusText: `导出完成，共 ${selectedConversations.length} 条` }
  }).catch(() => {});
}

function handleLoadToPopup() {
  const checkedItems = document.querySelectorAll('.item-checkbox.checked');
  if (checkedItems.length === 0) {
    notifyError('请先选择要导出的对话');
    return;
  }

  const selectedConversations = [];
  checkedItems.forEach(checkbox => {
    const convItem = checkbox.closest('[class*="history-item"]') ||
                     checkbox.closest('[class*="conversation"]') ||
                     checkbox.parentElement;
    if (convItem) {
      const titleEl = convItem.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '未命名对话';
      selectedConversations.push({
        id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        timestamp: Date.now()
      });
    }
  });

  if (selectedConversations.length === 0) {
    notifyError('未能获取选中对话信息');
    return;
  }

  chrome.storage.local.set({
    batchSelection: {
      conversations: selectedConversations,
      timestamp: Date.now()
    }
  }, () => {
    // 点击取消退出批量模式
    const cancelBtn = document.querySelector('div.btn.cancel');
    if (cancelBtn) cancelBtn.click();
    notifyError(`已加载 ${selectedConversations.length} 条对话到插件，请打开扩展弹窗选择格式导出`);
  });
}

// 页面加载后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectExportButton, 1000);
    injectBatchExportHook();
  });
} else {
  setTimeout(injectExportButton, 1000);
  injectBatchExportHook();
}
