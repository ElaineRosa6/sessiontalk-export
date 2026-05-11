/**
 * 平台适配器基础接口
 * 新增平台时继承此类并实现抽象方法
 */

export class BasePlatformAdapter {
  /**
   * 平台信息（子类必须覆盖）
   * @returns {{id: string, name: string, matchHosts: string[]}}
   */
  get info() {
    return {
      id: 'unknown',
      name: '未知平台',
      matchHosts: []
    };
  }

  /**
   * 检测当前页面是否属于该平台（子类必须实现）
   * @returns {boolean}
   */
  detect() {
    throw new Error('detect() 必须由子类实现');
  }

  /**
   * 滚动加载全部内容（子类必须实现）
   * 某些平台使用虚拟 DOM，需要滚动才能加载历史内容
   * @returns {Promise<void>}
   */
  async scrollToLoadAll() {
    throw new Error('scrollToLoadAll() 必须由子类实现');
  }

  /**
   * 获取侧边栏对话列表（子类必须实现）
   * @returns {Array<{id: string, title: string, timestamp: number, preview?: string}>}
   */
  getConversationList() {
    throw new Error('getConversationList() 必须由子类实现');
  }

  /**
   * 获取当前页面完整对话（子类必须实现）
   * @returns {{id: string, title: string, timestamp: number, messages: Array<{role: string, authorName: string, contentHtml: string}>}}
   */
  getCurrentConversation() {
    throw new Error('getCurrentConversation() 必须由子类实现');
  }

  /**
   * 工具方法：等待指定时间
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 工具方法：安全获取元素文本
   * @param {Element|null} el
   * @returns {string}
   */
  safeText(el) {
    return el?.textContent?.trim() || '';
  }

  /**
   * 工具方法：安全获取元素 HTML
   * @param {Element|null} el
   * @returns {string}
   */
  safeHtml(el) {
    return el?.innerHTML || '';
  }
}
