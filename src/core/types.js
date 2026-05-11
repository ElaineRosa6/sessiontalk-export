/**
 * 共享类型定义（JSDoc 形式）
 */

/**
 * 平台标识
 * @typedef {'chatglm' | 'kimi' | 'doubao' | 'custom'} PlatformId
 */

/**
 * 平台信息
 * @typedef {Object} PlatformInfo
 * @property {PlatformId} id - 平台唯一标识
 * @property {string} name - 平台显示名称
 * @property {string[]} matchHosts - 匹配的域名列表
 */

/**
 * 对话元信息
 * @typedef {Object} ConversationMeta
 * @property {string} id - 对话唯一标识
 * @property {string} title - 对话标题
 * @property {number} timestamp - 时间戳
 * @property {string} [preview] - 预览文本
 */

/**
 * 单条消息
 * @typedef {Object} Message
 * @property {'user' | 'assistant'} role - 角色
 * @property {string} authorName - 显示名称
 * @property {string} contentHtml - 消息的原始 HTML
 * @property {string} [textContent] - 纯文本内容（可选）
 */

/**
 * 完整对话
 * @typedef {Object} Conversation
 * @property {string} id - 对话唯一标识
 * @property {string} title - 对话标题
 * @property {number} timestamp - 时间戳
 * @property {Message[]} messages - 消息列表
 */

/**
 * 平台适配器接口
 * @typedef {Object} PlatformAdapter
 * @property {PlatformInfo} info - 平台信息
 * @property {() => boolean} detect - 检测当前页面是否属于该平台
 * @property {() => Promise<void>} scrollToLoadAll - 滚动加载全部内容
 * @property {() => ConversationMeta[]} getConversationList - 获取侧边栏对话列表
 * @property {() => Conversation} getCurrentConversation - 获取当前页面完整对话
 */

/**
 * 导出配置
 * @typedef {Object} ExportConfig
 * @property {'markdown' | 'html'} format - 导出格式
 * @property {boolean} merge - 是否合并为单文件
 * @property {string} [filenameTemplate] - 文件名模板
 */

/**
 * 导出结果
 * @typedef {Object} ExportResult
 * @property {boolean} success
 * @property {string} [filename] - 生成的文件名
 * @property {Blob} [blob] - 文件内容
 * @property {string} [error] - 错误信息
 */
