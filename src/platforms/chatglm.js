/**
 * 智谱清言（ChatGLM）平台适配器
 * 基于已验证的提取逻辑：滚动加载 + DOM 解析
 */

import { BasePlatformAdapter } from './base.js';
import { escapeHtml } from '../core/sanitize.js';

// 选择器常量（基于实际 DOM 结构）
const S = {
  // 对话项容器
  conversationItem: '.item.conversation-item',
  // 用户问题区域
  questionBlock: '.conversation.question',
  // 用户问题文本
  questionText: '.question-txt',
  // 用户名
  userName: '.user-name',
  // 回答内容区（非 thinking）
  answerWrap: '[class*="answer-content-wrap"]',
  // thinking 内容区（需要排除）
  thinkingWrap: '[class*="text-advance-thinking"]',
  // 侧边栏对话列表项
  historyItem: '[class*="history-item"]'
};

export class ChatGLMAdapter extends BasePlatformAdapter {
  get info() {
    return {
      id: 'chatglm',
      name: '智谱清言',
      matchHosts: ['chatglm.cn', '*.chatglm.cn']
    };
  }

  detect() {
    const host = window.location.hostname;
    return host.includes('chatglm.cn');
  }

  /**
   * 滚动加载全部历史对话
   * 智谱清言使用虚拟滚动，仅加载可见区域，需要滚动到底部再滚回来
   */
  async scrollToLoadAll() {
    // 查找主滚动容器
    const container = document.querySelector('.chatScrollContainer, .scroll-container, [class*="chat-scroll"]');
    const scrollEl = container || document.documentElement;

    // 滚动到底部
    let prevHeight = scrollEl.scrollHeight;
    scrollEl.scrollTop = prevHeight;
    await this.sleep(1500);

    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const newHeight = scrollEl.scrollHeight;
      if (newHeight === prevHeight) {
        // 高度没有变化，可能已到底部
        scrollEl.scrollTop = scrollEl.scrollHeight;
        await this.sleep(800);
        if (scrollEl.scrollHeight === prevHeight) break;
        prevHeight = scrollEl.scrollHeight;
      } else {
        prevHeight = newHeight;
      }
      attempts++;
    }

    // 滚回顶部，触发 DOM 渲染
    scrollEl.scrollTop = 0;
    await this.sleep(500);
  }

  /**
   * 获取侧边栏对话列表
   */
  getConversationList() {
    const items = document.querySelectorAll(S.historyItem);
    const conversations = [];

    items.forEach(item => {
      const titleEl = item.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '未命名对话';
      if (title.length > 0 && title.length < 100) {
        conversations.push({
          id: `conv_${crypto.randomUUID()}`,
          title,
          timestamp: Date.now(),
          preview: title.substring(0, 30)
        });
      }
    });

    return conversations;
  }

  /**
   * 获取当前页面完整对话
   * 解析所有 conversation-item，提取用户问题和 AI 回答
   */
  getCurrentConversation() {
    // 从 URL 获取对话标题
    let title = '当前对话';
    const urlParams = new URLSearchParams(window.location.search);
    const cid = urlParams.get('cid') || urlParams.get('id');

    // 获取页面 title 作为补充
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== '智谱清言') {
      title = pageTitle.replace(' - 智谱清言', '').replace('智谱清言 - ', '');
    }

    // 查找所有对话项
    const items = document.querySelectorAll(S.conversationItem);
    if (items.length === 0) {
      // 降级：尝试从页面查找消息
      return this._fallbackExtract(title);
    }

    const messages = [];

    items.forEach(item => {
      // 提取用户问题
      const userMsg = this._extractUserMessage(item);
      if (userMsg) {
        messages.push(userMsg);
      }

      // 提取 AI 回答
      const aiMsg = this._extractAssistantMessage(item);
      if (aiMsg) {
        messages.push(aiMsg);
      }
    });

    return {
      id: cid || `chatglm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      timestamp: Date.now(),
      messages
    };
  }

  /**
   * 从对话项中提取用户消息
   */
  _extractUserMessage(item) {
    const questionBlock = item.querySelector(S.questionBlock);
    if (!questionBlock) return null;

    // 提取用户名
    const nameEl = item.querySelector(S.userName);
    const authorName = nameEl?.textContent?.trim() || '用户';

    // 提取问题文本（需要处理嵌套 div 结构）
    const questionTextEl = item.querySelector(S.questionText);
    let question = this.safeText(questionTextEl);
    question = question.replace(/复制入框/g, '').trim();

    if (!question) return null;

    return {
      role: 'user',
      authorName,
      contentHtml: `<p>${escapeHtml(question)}</p>`
    };
  }

  /**
   * 从对话项中提取 AI 回答
   */
  _extractAssistantMessage(item) {
    // 找到所有 answer-content-wrap（排除 thinking）
    const allWraps = item.querySelectorAll('[class*="answer-content-wrap"]');
    let targetHtml = '';

    allWraps.forEach(wrap => {
      // 检查是否在 thinking 区域内
      const parent = wrap.closest('[class*="text-advance-thinking"]');
      if (!parent) {
        // 只保留最后一个非 thinking 回答（通常是最完整的）
        targetHtml = wrap.innerHTML;
      }
    });

    if (!targetHtml) return null;

    // 检查非 thinking 回答是否缺少实质性内容（只有 widget 没有代码块）
    // 如果是，从 thinking 区域提取代码块补充进来
    const hasCodeBlocks = /language\s+language-|language-\w+/.test(targetHtml);
    if (!hasCodeBlocks) {
      const thinkingCode = this._extractCodeFromThinking(item);
      if (thinkingCode) {
        targetHtml = targetHtml + '\n' + thinkingCode;
      }
    }

    // 清理 wrapper div
    const cleaned = this._cleanWrapperHtml(targetHtml);

    return {
      role: 'assistant',
      authorName: 'ChatGLM',
      contentHtml: cleaned
    };
  }

  /**
   * 从 thinking 区域提取代码块 HTML
   * 当最终回答只有 widget 没有实际代码时调用
   */
  _extractCodeFromThinking(item) {
    const thinkingWrap = item.querySelector('[class*="text-advance-thinking"]');
    if (!thinkingWrap) return null;

    // 只选顶层 div 容器（包含 language 类和 pre 子元素）
    const allCandidates = thinkingWrap.querySelectorAll('div[class*="language"]');
    const htmlParts = [];
    const seen = new Set();

    allCandidates.forEach(block => {
      const cls = block.className || '';
      // 只匹配 "language language-xxx" 或 "language-xxx" 格式
      const isCodeBlock = /language\s+language-/.test(cls) || /language-\w+/.test(cls);
      if (!isCodeBlock) return;
      // 避免嵌套重复：只取最外层容器
      const parent = block.parentElement?.closest('div[class*="language"]');
      if (parent && seen.has(parent)) return;

      const clone = block.cloneNode(true);
      htmlParts.push(clone.outerHTML);
      seen.add(block);
    });

    return htmlParts.length > 0 ? htmlParts.join('\n') : null;
  }

  /**
   * 清理回答内容的 wrapper div 标签
   */
  _cleanWrapperHtml(html) {
    // 移除最外层多余的 div wrapper（保留内部内容）
    let cleaned = html;
    // 移除 data-v-xxx 属性
    cleaned = cleaned.replace(/\s*data-v-[a-f0-9]+=""/g, '');
    // 移除空的 wrapper div
    cleaned = cleaned.replace(/<div\s+class="markdown-body[^"]*"[^>]*>/g, '');
    cleaned = cleaned.replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/g, '');
    return cleaned.trim();
  }

  /**
   * 降级提取：当无法找到 conversation-item 时
   */
  _fallbackExtract(title) {
    // 尝试从 markdown-body 元素获取内容
    const bodies = document.querySelectorAll('.markdown-body, .md-body');
    const messages = [];

    bodies.forEach(body => {
      // 跳过 thinking 区域
      const parent = body.closest('[class*="thinking"]');
      if (parent) return;

      messages.push({
        role: 'assistant',
        authorName: 'ChatGLM',
        contentHtml: body.innerHTML
      });
    });

    return {
      id: `chatglm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      timestamp: Date.now(),
      messages
    };
  }

}
