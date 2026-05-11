/**
 * 验证 .code-block widget 格式不会阻止 thinking 代码提取
 */
import { JSDOM } from 'jsdom';

// 模拟用户提醒的实际 DOM 结构
const html = `
<div class="item conversation-item">
  <div class="conversation question">
    <span class="user-name">用户</span>
    <div class="question-txt">hello world</div>
  </div>
  <div class="answer-content-wrap">
    <div class="markdown-body">
      <p>这是 HTML 版本：</p>
      <div class="code-block el-tooltip__trigger el-tooltip__trigger">
        <div class="left-box">
          <p class="code-block-icon"></p>
          <div class="title-box">
            <p class="title">代码生成完成</p>
            <p class="brief">HTML代码</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 12 16">
          <g clip-path="url(#a)"><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="m4 12 3.646-3.646a.5.5 0 0 0 0-.708L4 4"></path></g>
        </svg>
      </div>
    </div>
  </div>
  <div class="text-advance-thinking-content">
    <div class="code-block language language-html" lang="html">
      <pre><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;&lt;body&gt;&lt;h1&gt;Hello&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;</code></pre>
    </div>
  </div>
</div>
`;

const dom = new JSDOM(html);
global.document = dom.window.document;

import { ChatGLMAdapter } from '../src/platforms/chatglm.js';
const adapter = new ChatGLMAdapter();

const item = document.querySelector('.conversation-item');
const answerWrap = item.querySelector('.answer-content-wrap');

// 检查 widget 是否会被误判为有代码块
const hasCodeBlocks = /language\s+language-|language-\w+/.test(answerWrap.innerHTML);
console.log(`Widget 被识别为代码块: ${hasCodeBlocks ? 'YES (错误)' : 'NO (正确)'}`);

// 实际提取
const aiMsg = adapter._extractAssistantMessage(item);
if (!aiMsg) {
  console.log('FAIL: 未提取到内容');
  process.exit(1);
}

const hasHtmlBlock = /language-html|language language-html/.test(aiMsg.contentHtml);
console.log(`从 thinking 提取了 HTML 代码: ${hasHtmlBlock ? 'PASS' : 'FAIL'}`);

// 导入 htmlToMd 验证最终输出
const { htmlToMarkdown } = await import('../src/core/htmlToMd.js');
const md = htmlToMarkdown(aiMsg.contentHtml);
console.log('\n最终 Markdown:');
console.log(md);

const hasCodeFence = md.includes('```html');
const noWidgetGarbage = !md.includes('代码生成完成') && !md.includes('HTML代码');
console.log(`\n代码块正确提取: ${hasCodeFence ? 'PASS' : 'FAIL'}`);
console.log(`Widget 垃圾文本已清理: ${noWidgetGarbage ? 'PASS' : 'FAIL'}`);

if (hasCodeFence && noWidgetGarbage && hasHtmlBlock) {
  console.log('\n用户提醒的场景已正确修复！');
} else {
  console.log('\n部分测试失败');
  process.exit(1);
}
