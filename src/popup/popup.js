/**
 * AI对话导出助手 - Popup 主逻辑
 */

const SELECTORS = {
  conversationList: '#conversation-list',
  searchInput: '#search-input',
  filterBtn: '#filter-btn',
  filterPanel: '#filter-panel',
  selectAllBtn: '#select-all-btn',
  invertSelectBtn: '#invert-select-btn',
  selectedCount: '#selected-count',
  exportBtn: '#export-btn',
  quickExportBtn: '#quick-export-btn',
  mergeCheckbox: '#merge-checkbox',
  progressModal: '#progress-modal',
  progressFill: '#progress-fill',
  progressText: '#progress-text',
  progressPercent: '#progress-percent',
  cancelBtn: '#cancel-btn',
  statusToast: '#status-toast',
  settingsBtn: '#settings-btn',
  platformBadge: '#platform-badge',
  statusBar: '#status-bar',
  statusText: '#status-text'
};

// ========== 状态管理 ==========
class PopupState {
  constructor() {
    this.conversations = [];
    this.selectedIds = new Set();
    this.currentFilter = 'all';
    this.searchKeyword = '';
    this.isExporting = false;
    this.exportCancelled = false;
    this.detectedPlatform = null;
  }

  getFilteredConversations() {
    let result = [...this.conversations];
    if (this.searchKeyword) {
      const keyword = this.searchKeyword.toLowerCase();
      result = result.filter(conv =>
        conv.title?.toLowerCase().includes(keyword) ||
        conv.preview?.toLowerCase().includes(keyword)
      );
    }
    if (this.currentFilter !== 'all') {
      result = result.filter(conv => this.filterByDate(conv, this.currentFilter));
    }
    return result;
  }

  filterByDate(conversation, filter) {
    const timestamp = conversation.timestamp || Date.now();
    const date = new Date(timestamp);
    const now = new Date();
    switch (filter) {
      case 'today': return date.toDateString() === now.toDateString();
      case 'week': return date >= new Date(now - 7 * 24 * 60 * 60 * 1000);
      case 'month': return date >= new Date(now - 30 * 24 * 60 * 60 * 1000);
      default: return true;
    }
  }

  updateSelectedCount() {
    const countEl = document.querySelector(SELECTORS.selectedCount);
    if (countEl) countEl.textContent = `已选: ${this.selectedIds.size} 条`;
    const exportBtn = document.querySelector(SELECTORS.exportBtn);
    if (exportBtn) exportBtn.disabled = this.selectedIds.size === 0;
  }
}

// ========== Popup 控制器 ==========
const MESSAGE_TIMEOUT = 15000;

class PopupController {
  constructor() {
    this.state = new PopupState();
    this.init();
  }

  async init() {
    this.bindEvents();
    this.bindProgressListener();
    // 并行检测平台和加载对话列表
    await Promise.all([
      this.detectPlatform(),
      this.loadConversations()
    ]);
    this.render();
  }

  sendMessageWithTimeout(tabId, message, timeoutMs = MESSAGE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      let settled = false;
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (settled) return;
        settled = true;
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
      setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('请求超时，请刷新页面后重试'));
      }, timeoutMs);
    });
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('无法获取当前标签页');
    return tab;
  }

  /**
   * 监听导出进度更新
   */
  bindProgressListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXPORT_PROGRESS' && this.state.isExporting) {
        const { percent, statusText } = message.data;
        this.updateProgress(percent, statusText);
      }
      if (message.type === 'EXPORT_ERROR') {
        this.hideProgressModal();
        this.showToast(message.data?.message || '导出出错', 'error');
      }
    });
  }

  /**
   * 检测当前平台
   */
  async detectPlatform() {
    try {
      const tab = await this.getActiveTab();
      const response = await this.sendMessageWithTimeout(tab.id, { type: 'DETECT_PLATFORM' });
      if (response?.success && response.platform) {
        this.state.detectedPlatform = response.platform;
        this.showPlatformStatus(response.platform);
      } else {
        this.showPlatformStatus(null);
      }
    } catch {
      this.showPlatformStatus(null);
    }
  }

  showPlatformStatus(platform) {
    const badge = document.querySelector(SELECTORS.platformBadge);
    const statusText = document.querySelector(SELECTORS.statusText);
    if (!badge || !statusText) return;

    if (platform) {
      badge.textContent = platform.name;
      badge.style.background = '#52c41a';
      statusText.textContent = `已检测到 ${platform.name}，可使用导出功能`;
      statusText.style.color = '#52c41a';
    } else {
      badge.textContent = '未检测';
      badge.style.background = '#999';
      statusText.textContent = '请在 AI 对话平台页面使用此插件';
      statusText.style.color = '#999';
    }
  }

  async loadConversations() {
    try {
      const tab = await this.getActiveTab();
      const response = await this.sendMessageWithTimeout(tab.id, {
        type: 'GET_CONVERSATION_LIST'
      });

      if (response?.success) {
        this.state.conversations = response.data || [];
        // 检查是否有批量选中的对话需要预选
        await this.applyBatchPreselection();
        this.renderConversationList();
      } else {
        this.showToast('获取对话列表失败，请刷新页面', 'warning');
      }
    } catch (error) {
      console.error('加载对话列表失败:', error);
      const msg = error.message || '请刷新页面后重试';
      this.showToast(`${msg}（如已重新加载扩展，请刷新 AI 平台页面）`, 'warning');
    }
  }

  async applyBatchPreselection() {
    try {
      const data = await chrome.storage.local.get('batchSelection');
      if (!data.batchSelection) return;
      // 只使用 30 秒内的批量选择
      if (Date.now() - data.batchSelection.timestamp > 30000) {
        await chrome.storage.local.remove('batchSelection');
        return;
      }
      const batchTitles = new Set(data.batchSelection.conversations.map(c => c.title));
      this.state.conversations.forEach(conv => {
        if (batchTitles.has(conv.title)) {
          this.state.selectedIds.add(conv.id);
        }
      });
      // 清除存储（一次性消费）
      await chrome.storage.local.remove('batchSelection');
      if (this.state.selectedIds.size > 0) {
        this.showToast(`已自动选中 ${this.state.selectedIds.size} 条对话`, 'info');
      }
    } catch {
      // 忽略存储读取错误
    }
  }

  bindEvents() {
    document.querySelector(SELECTORS.searchInput)?.addEventListener('input', (e) => {
      this.state.searchKeyword = e.target.value;
      this.renderConversationList();
    });

    document.querySelector(SELECTORS.filterBtn)?.addEventListener('click', () => {
      const panel = document.querySelector(SELECTORS.filterPanel);
      if (panel) panel.hidden = !panel.hidden;
    });

    document.querySelector('#date-filter')?.addEventListener('change', (e) => {
      this.state.currentFilter = e.target.value;
      this.renderConversationList();
    });

    document.querySelector(SELECTORS.selectAllBtn)?.addEventListener('click', () => this.selectAll());
    document.querySelector(SELECTORS.invertSelectBtn)?.addEventListener('click', () => this.invertSelect());

    document.querySelector(SELECTORS.exportBtn)?.addEventListener('click', () => this.startExport());
    document.querySelector(SELECTORS.quickExportBtn)?.addEventListener('click', () => this.quickExport());
    document.querySelector(SELECTORS.cancelBtn)?.addEventListener('click', () => this.cancelExport());
    document.querySelector(SELECTORS.settingsBtn)?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }

  renderConversationList() {
    const container = document.querySelector(SELECTORS.conversationList);
    if (!container) return;

    const conversations = this.state.getFilteredConversations();
    while (container.firstChild) container.removeChild(container.firstChild);

    if (conversations.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-placeholder';
      emptyDiv.textContent = '暂无对话数据';
      container.appendChild(emptyDiv);
      return;
    }

    conversations.forEach(conv => {
      const itemEl = this.createConversationItem(conv);
      container.appendChild(itemEl);
    });
  }

  createConversationItem(conv) {
    const isSelected = this.state.selectedIds.has(conv.id);
    const dateStr = this.formatDate(conv.timestamp);

    const itemDiv = document.createElement('div');
    itemDiv.className = 'conversation-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'conversation-checkbox';
    checkbox.dataset.id = conv.id;
    checkbox.checked = isSelected;
    checkbox.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) this.state.selectedIds.add(id);
      else this.state.selectedIds.delete(id);
      this.state.updateSelectedCount();
    });

    const infoDiv = document.createElement('div');
    infoDiv.className = 'conversation-info';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'conversation-title';
    titleDiv.textContent = conv.title || '未命名对话';

    const metaDiv = document.createElement('div');
    metaDiv.className = 'conversation-meta';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'conversation-date';
    dateSpan.textContent = dateStr;

    metaDiv.appendChild(dateSpan);
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(metaDiv);
    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(infoDiv);

    return itemDiv;
  }

  selectAll() {
    this.state.getFilteredConversations().forEach(conv => this.state.selectedIds.add(conv.id));
    this.renderConversationList();
    this.state.updateSelectedCount();
  }

  invertSelect() {
    const ids = new Set(this.state.getFilteredConversations().map(c => c.id));
    this.state.selectedIds.forEach(id => {
      if (ids.has(id)) this.state.selectedIds.delete(id);
    });
    ids.forEach(id => {
      if (!this.state.selectedIds.has(id)) this.state.selectedIds.add(id);
    });
    this.renderConversationList();
    this.state.updateSelectedCount();
  }

  /**
   * 快速导出当前对话
   */
  async quickExport() {
    if (!this.state.detectedPlatform) {
      this.showToast('未检测到支持的 AI 平台', 'warning');
      return;
    }

    const format = document.querySelector('input[name="format"]:checked')?.value || 'markdown';
    this.showProgressModal();
    this.updateProgress(0, '正在导出当前对话...');

    try {
      const tab = await this.getActiveTab();
      const response = await this.sendMessageWithTimeout(tab.id, {
        type: 'EXPORT_CURRENT',
        data: { format }
      });

      if (response?.success) {
        this.updateProgress(100, '导出完成！');
        setTimeout(() => {
          this.hideProgressModal();
          this.showToast('导出完成', 'success');
        }, 500);
      } else {
        this.hideProgressModal();
        this.showToast(response?.error || '导出失败', 'error');
      }
    } catch (err) {
      this.hideProgressModal();
      this.showToast('导出失败: ' + err.message, 'error');
    }
  }

  async startExport() {
    if (this.state.selectedIds.size === 0) return;

    this.state.isExporting = true;
    this.state.exportCancelled = false;
    this.showProgressModal();

    const selectedConversations = this.state.conversations.filter(
      conv => this.state.selectedIds.has(conv.id)
    );
    const format = document.querySelector('input[name="format"]:checked')?.value || 'markdown';
    const merge = document.querySelector(SELECTORS.mergeCheckbox)?.checked || false;

    try {
      const tab = await this.getActiveTab();
      const response = await this.sendMessageWithTimeout(tab.id, {
        type: 'EXPORT_CONVERSATIONS',
        data: { conversations: selectedConversations, format, merge }
      });

      if (this.state.exportCancelled) {
        this.hideProgressModal();
        this.showToast('导出已取消', 'info');
        return;
      }

      if (response?.success) {
        this.updateProgress(100, '导出完成！');
        setTimeout(() => {
          this.hideProgressModal();
          this.showToast('导出成功！', 'success');
        }, 500);
      } else {
        this.hideProgressModal();
        this.showToast(response?.error || '导出失败', 'error');
      }
    } catch (err) {
      this.hideProgressModal();
      this.showToast('导出失败: ' + err.message, 'error');
    } finally {
      this.state.isExporting = false;
    }
  }

  cancelExport() {
    this.state.exportCancelled = true;
    this.state.isExporting = false;
  }

  showProgressModal() {
    const modal = document.querySelector(SELECTORS.progressModal);
    if (modal) { modal.hidden = false; this.updateProgress(0, '准备中...'); }
  }

  hideProgressModal() {
    const modal = document.querySelector(SELECTORS.progressModal);
    if (modal) modal.hidden = true;
  }

  updateProgress(percent, text) {
    const fill = document.querySelector(SELECTORS.progressFill);
    const textEl = document.querySelector(SELECTORS.progressText);
    const percentEl = document.querySelector(SELECTORS.progressPercent);
    if (fill) fill.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
    if (percentEl) percentEl.textContent = `${percent}%`;
  }

  showToast(message, type = 'info') {
    const toast = document.querySelector(SELECTORS.statusToast);
    if (!toast) return;
    toast.textContent = message;
    toast.className = `status-toast status-toast-${type}`;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3000);
  }

  formatDate(timestamp) {
    if (!timestamp) return '未知时间';
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }

  render() {
    this.renderConversationList();
    this.state.updateSelectedCount();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
