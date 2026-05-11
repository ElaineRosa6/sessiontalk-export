/**
 * 智谱清言导出助手 - 设置页面逻辑
 */

class OptionsController {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(null);

    // 设置默认格式
    const format = result.defaultFormat || 'markdown';
    const formatRadio = document.querySelector(`input[name="defaultFormat"][value="${format}"]`);
    if (formatRadio) formatRadio.checked = true;

    // 设置其他选项
    const includeTimestamp = document.querySelector('#includeTimestamp');
    const includeMetadata = document.querySelector('#includeMetadata');
    const autoMerge = document.querySelector('#autoMerge');
    const filenameTemplate = document.querySelector('#filenameTemplate');
    const debugMode = document.querySelector('#debugMode');

    if (includeTimestamp) includeTimestamp.checked = result.includeTimestamp !== false;
    if (includeMetadata) includeMetadata.checked = result.includeMetadata !== false;
    if (autoMerge) autoMerge.checked = result.autoMerge || false;
    if (filenameTemplate) filenameTemplate.value = result.filenameTemplate || '{title}_{date}';
    if (debugMode) debugMode.checked = result.debugMode || false;
  }

  bindEvents() {
    document.querySelector('#saveBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    document.querySelector('#resetBtn')?.addEventListener('click', () => {
      this.resetSettings();
    });
  }

  async saveSettings() {
    const settings = {
      defaultFormat: document.querySelector('input[name="defaultFormat"]:checked')?.value,
      includeTimestamp: document.querySelector('#includeTimestamp')?.checked,
      includeMetadata: document.querySelector('#includeMetadata')?.checked,
      autoMerge: document.querySelector('#autoMerge')?.checked,
      filenameTemplate: document.querySelector('#filenameTemplate')?.value,
      debugMode: document.querySelector('#debugMode')?.checked
    };

    await chrome.storage.local.set(settings);

    this.showToast('设置已保存', 'success');
  }

  async resetSettings() {
    await chrome.storage.local.clear();
    await this.loadSettings();
    this.showToast('已重置为默认设置', 'info');
  }

  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
