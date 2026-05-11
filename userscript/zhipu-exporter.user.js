// ==UserScript==
// @name         智谱清言对话导出助手（油猴版）
// @namespace    https://chatglm.cn/
// @version      1.0.0
// @description  轻量级智谱清言对话导出工具，支持单条对话导出为 Markdown/Text/JSON/HTML
// @author       SessionTalk Exporter
// @match        https://chatglm.cn/*
// @match        https://*.chatglm.cn/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// @require      https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ========== 常量定义 ==========
    const SELECTORS = {
        conversationList: '[class*="sidebar"] [class*="list"]',
        conversationItem: '[class*="conversation-item"], [class*="chat-item"]',
        conversationTitle: '[class*="title"], [class*="name"]',
        messageContainer: '[class*="message-list"], [class*="chat-content"]',
        messageItem: '[class*="message-item"], [class*="chat-message"]',
        userMessage: '[class*="user"], [data-role="user"]',
        assistantMessage: '[class*="assistant"], [data-role="assistant"]',
        messageContent: '[class*="content"], [class*="text"]',
        timestamp: '[class*="time"], [class*="date"]'
    };

    // ========== DOM 解析器 ==========
    class DOMParser {
        constructor(selectors) {
            this.selectors = selectors;
        }

        parseConversationList() {
            const items = document.querySelectorAll(this.selectors.conversationItem);
            return Array.from(items).map(item => this.parseConversationItem(item));
        }

        parseConversationItem(element) {
            return {
                id: this.extractId(element),
                title: element.querySelector(this.selectors.conversationTitle)?.textContent?.trim() || '未命名对话',
                timestamp: this.parseTimestamp(element),
                preview: this.extractPreview(element)
            };
        }

        parseCurrentConversation() {
            const messages = document.querySelectorAll(this.selectors.messageItem);
            return {
                id: this.getCurrentConversationId(),
                title: this.getCurrentTitle(),
                messages: Array.from(messages).map(msg => this.parseMessage(msg)),
                timestamp: Date.now()
            };
        }

        parseMessage(element) {
            const isUser = element.matches(this.selectors.userMessage) ||
                           element.querySelector(this.selectors.userMessage);
            return {
                role: isUser ? 'user' : 'assistant',
                content: this.extractContent(element),
                timestamp: this.extractMessageTimestamp(element)
            };
        }

        extractContent(element) {
            const contentEl = element.querySelector(this.selectors.messageContent);
            if (!contentEl) return { type: 'text', text: '' };

            const codeBlock = contentEl.querySelector('pre, code');
            if (codeBlock) {
                return { type: 'markdown', text: this.extractMarkdownContent(contentEl) };
            }
            return { type: 'text', text: contentEl.textContent?.trim() || '' };
        }

        extractMarkdownContent(element) {
            let text = element.textContent?.trim() || '';
            const codeBlocks = element.querySelectorAll('pre');
            codeBlocks.forEach(block => {
                const code = block.textContent;
                const lang = block.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
                const markdownCode = '\n```' + lang + '\n' + code + '\n```\n';
                text = text.replace(code, markdownCode);
            });
            return text;
        }

        extractId(element) {
            return element.dataset?.id ||
                   element.href?.split('/').pop() ||
                   element.id ||
                   'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        extractPreview(element) {
            const previewEl = element.querySelector('[class*="preview"], [class*="summary"]');
            return previewEl?.textContent?.trim()?.substring(0, 50) || '';
        }

        parseTimestamp(element) {
            const timeEl = element.querySelector(this.selectors.timestamp);
            if (!timeEl) return Date.now();
            return this.parseTimeText(timeEl.textContent);
        }

        parseTimeText(text) {
            if (!text) return Date.now();
            const now = Date.now();

            if (text.includes('刚刚') || text.includes('秒前')) return now;
            if (text.includes('分钟前')) return now - (parseInt(text) || 1) * 60 * 1000;
            if (text.includes('小时前')) return now - (parseInt(text) || 1) * 60 * 60 * 1000;
            if (text.includes('昨天')) return now - 24 * 60 * 60 * 1000;
            if (text.includes('天前')) return now - (parseInt(text) || 1) * 24 * 60 * 60 * 1000;

            try { return new Date(text).getTime(); }
            catch { return now; }
        }

        extractMessageTimestamp(element) {
            const timeEl = element.querySelector('[class*="time"]');
            return timeEl ? this.parseTimeText(timeEl.textContent) : Date.now();
        }

        getCurrentConversationId() {
            const urlMatch = window.location.pathname.match(/\/chat\/([^\/]+)/);
            return urlMatch?.[1] || 'current_' + Date.now();
        }

        getCurrentTitle() {
            const titleEl = document.querySelector('[class*="chat-title"], [class*="conversation-title"]');
            return titleEl?.textContent?.trim() || '当前对话';
        }
    }

    // ========== 格式化工具 ==========
    class Formatter {
        format(conv, format) {
            switch (format) {
                case 'markdown': return this.toMarkdown(conv);
                case 'text': return this.toText(conv);
                case 'json': return this.toJSON(conv);
                case 'html': return this.toHTML(conv);
                default: return this.toMarkdown(conv);
            }
        }

        toMarkdown(conv) {
            const lines = ['# ' + conv.title, '', '> 导出时间: ' + new Date().toLocaleString(), '', '---', ''];
            conv.messages.forEach(msg => {
                const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
                lines.push('### ' + role, '', msg.content.text, '', '---', '');
            });
            return lines.join('\n');
        }

        toText(conv) {
            const lines = ['对话标题: ' + conv.title, '导出时间: ' + new Date().toLocaleString(), ''];
            conv.messages.forEach(msg => {
                const role = msg.role === 'user' ? '[用户]' : '[助手]';
                lines.push(role + ':', msg.content.text, '', '------------------------------', '');
            });
            return lines.join('\n');
        }

        toJSON(conv) {
            return JSON.stringify(conv, null, 2);
        }

        toHTML(conv) {
            const messageItems = conv.messages.map(msg => {
                const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 助手';
                return '<div class="message ' + msg.role + '"><div class="role">' + roleLabel + '</div><div class="content">' + this.escapeHtml(msg.content.text) + '</div></div>';
            }).join('');

            return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>' + this.escapeHtml(conv.title) + '</title><style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px}.message{margin:16px 0;padding:12px;border-radius:8px}.user{background:#e3f2fd}.assistant{background:#f5f5f5}.role{font-weight:bold;margin-bottom:8px}</style></head><body><h1>' + this.escapeHtml(conv.title) + '</h1>' + messageItems + '</body></html>';
        }

        escapeHtml(text) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }

        getExtension(format) {
            return { markdown: 'md', text: 'txt', json: 'json', html: 'html' }[format] || 'md';
        }

        generateFilename(conv, format) {
            const safeTitle = (conv.title || '未命名对话').replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
            const date = new Date(conv.timestamp).toISOString().split('T')[0];
            return safeTitle + '_' + date + '.' + this.getExtension(format);
        }
    }

    // ========== 导出控制器 ==========
    class ExportController {
        constructor() {
            this.parser = new DOMParser(SELECTORS);
            this.formatter = new Formatter();
            this.init();
        }

        init() {
            this.createUI();
            this.bindEvents();
        }

        createUI() {
            const container = document.createElement('div');
            container.id = 'zhipu-export-panel';

            // 使用安全的 DOM 操作创建 UI
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'ze-btn ze-btn-primary';
            toggleBtn.id = 'ze-toggle';
            toggleBtn.textContent = '导出';

            const dropdown = document.createElement('div');
            dropdown.className = 'ze-dropdown';
            dropdown.id = 'ze-dropdown';
            dropdown.style.display = 'none';

            const header = document.createElement('div');
            header.className = 'ze-header';
            header.textContent = '导出当前对话';

            const body = document.createElement('div');
            body.className = 'ze-body';

            const optionDiv = document.createElement('div');
            optionDiv.className = 'ze-option';

            const label = document.createElement('label');
            label.textContent = '格式:';

            const select = document.createElement('select');
            select.id = 'ze-format';

            const formats = ['markdown', 'text', 'json', 'html'];
            formats.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f.charAt(0).toUpperCase() + f.slice(1);
                select.appendChild(opt);
            });

            optionDiv.appendChild(label);
            optionDiv.appendChild(select);

            const actions = document.createElement('div');
            actions.className = 'ze-actions';

            const exportBtn = document.createElement('button');
            exportBtn.className = 'ze-btn ze-btn-primary';
            exportBtn.id = 'ze-export';
            exportBtn.textContent = '确认导出';

            actions.appendChild(exportBtn);
            body.appendChild(optionDiv);
            body.appendChild(actions);
            dropdown.appendChild(header);
            dropdown.appendChild(body);
            container.appendChild(toggleBtn);
            container.appendChild(dropdown);
            document.body.appendChild(container);

            this.addStyles();
        }

        addStyles() {
            GM_addStyle(`
                #zhipu-export-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .ze-btn {
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: #fff;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .ze-btn-primary {
                    background: #1890ff;
                    color: #fff;
                    border-color: #1890ff;
                }
                .ze-btn:hover {
                    opacity: 0.8;
                }
                .ze-dropdown {
                    position: absolute;
                    bottom: 50px;
                    right: 0;
                    width: 250px;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                }
                .ze-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #eee;
                    font-weight: 500;
                }
                .ze-body {
                    padding: 16px;
                }
                .ze-option {
                    margin-bottom: 12px;
                }
                .ze-option label {
                    display: block;
                    margin-bottom: 6px;
                    color: #666;
                }
                .ze-option select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .ze-actions {
                    margin-top: 16px;
                }
                .ze-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 24px;
                    background: #52c41a;
                    color: #fff;
                    border-radius: 4px;
                    z-index: 10000;
                }
            `);
        }

        bindEvents() {
            const toggleBtn = document.getElementById('ze-toggle');
            const dropdown = document.getElementById('ze-dropdown');
            const exportBtn = document.getElementById('ze-export');

            if (toggleBtn && dropdown) {
                toggleBtn.addEventListener('click', function() {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                });
            }

            if (exportBtn) {
                exportBtn.addEventListener('click', function() {
                    const formatSelect = document.getElementById('ze-format');
                    const format = formatSelect ? formatSelect.value : 'markdown';
                    this.exportCurrent(format);
                    dropdown.style.display = 'none';
                }.bind(this));
            }
        }

        exportCurrent(format) {
            const conv = this.parser.parseCurrentConversation();
            const content = this.formatter.format(conv, format);
            const filename = this.formatter.generateFilename(conv, format);

            const mimeTypes = {
                markdown: 'text/markdown',
                text: 'text/plain',
                json: 'application/json',
                html: 'text/html'
            };
            const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
            saveAs(blob, filename);

            this.showToast('导出成功！');
        }

        showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'ze-toast';
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(function() {
                toast.remove();
            }, 2000);
        }
    }

    // ========== 初始化 ==========
    new ExportController();

})();