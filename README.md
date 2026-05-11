# SessionTalk Export - AI 对话导出助手

将 AI 对话平台（智谱清言等）的历史对话记录导出为 Markdown 或 HTML 文件。支持单条导出、批量导出、合并导出。

## 功能特性

- **平台适配器架构** - 易于扩展支持新的 AI 对话平台
- **当前对话导出** - 页面右下角浮动按钮，一键导出当前对话
- **批量导出** - 在对话列表批量操作栏中注入"导出"按钮，勾选后直接导出
- **Popup 面板导出** - 点击扩展图标打开面板，选择对话、格式后导出
- **合并导出** - 将多条对话合并为单个文件
- **多格式支持** - Markdown（保留代码块、列表）、HTML（离线可读）
- **自动同步** - 批量模式下勾选的对话自动同步到 popup 面板
- **本地处理** - 所有数据在浏览器本地处理，不上传第三方

## 安装

### Chrome 扩展

1. 克隆仓库：`git clone https://github.com/<your-username>/sessiontalk-export.git`
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `dist` 目录

### 开发构建

```bash
npm install
npx webpack --mode production   # 构建到 dist/
npx webpack --mode development --watch  # 开发模式
```

## 项目结构

```
src/
├── manifest.json              # Chrome 扩展配置（Manifest V3）
├── background/
│   └── service-worker.js      # 后台服务
├── content/
│   ├── index.js               # Content Script 入口（平台检测、导出逻辑、钩子注入）
│   └── styles/content.css     # 注入按钮样式
├── core/
│   ├── downloader.js          # 文件下载（Blob URL + Chrome Downloads API）
│   ├── htmlExporter.js        # 对话 → HTML 导出
│   ├── htmlToMd.js            # HTML → Markdown 转换
│   ├── sanitize.js            # HTML 净化（XSS 防护）
│   └── types.js               # 类型定义
├── platforms/
│   ├── base.js                # 平台适配器基类
│   └── chatglm.js             # 智谱清言适配器
├── popup/
│   ├── popup.html/js/css      # 扩展弹窗
└── options/
    ├── options.html/js/css    # 设置页面
```

## 新增平台适配

1. 创建 `src/platforms/<platform>.js`
2. 继承 `BasePlatformAdapter`，实现以下方法：
   - `detect()` - 检测当前页面是否匹配该平台
   - `getConversationList()` - 获取对话列表
   - `getCurrentConversation()` - 提取当前对话内容
   - `scrollToLoadAll()` - 滚动加载所有内容
3. 在 `src/content/index.js` 的 `PLATFORMS` 数组中注册

## 架构

- **Content Script**：页面注入层，负责平台检测、DOM 解析、导出执行、批量钩子注入
- **Popup**：用户交互面板，显示对话列表、选择导出格式、触发导出
- **Background**：消息中转、下载事件处理
- **适配器模式**：平台相关逻辑封装在 adapter 中，核心导出流程与平台无关

## 许可证

MIT License
