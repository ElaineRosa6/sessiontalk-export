/**
 * 测试完整提取流水线：DOM 提取 + HTML 转 Markdown
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

// 加载测试 HTML
const html = readFileSync('./test/cookie_conversation_test.html', 'utf-8');
const dom = new JSDOM(html);
global.document = dom.window.document;

// 导入平台适配器
import { ChatGLMAdapter } from '../src/platforms/chatglm.js';

// 动态导入 htmlToMd (it's an ES module)
const { htmlToMarkdown } = await import('../src/core/htmlToMd.js');

const adapter = new ChatGLMAdapter();
const item = document.querySelector('.conversation-item');

console.log('=== 测试完整提取流水线 ===\n');

// Step 1: 提取 AI 回答
const aiMsg = adapter._extractAssistantMessage(item);
if (!aiMsg) {
  console.log('FAIL: AI 回答未提取到任何内容');
  process.exit(1);
}

// Step 2: 转为 Markdown
const md = htmlToMarkdown(aiMsg.contentHtml);

console.log('转换后的 Markdown：');
console.log('='.repeat(50));
console.log(md);
console.log('='.repeat(50));
console.log();

// 验证
const hasHtmlCodeBlock = md.includes('```html');
const hasCssCodeBlock = md.includes('```css');

console.log('--- 验证结果 ---');
console.log(`HTML 代码块 (markdown): ${hasHtmlCodeBlock ? 'PASS' : 'FAIL'}`);
console.log(`CSS 代码块 (markdown): ${hasCssCodeBlock ? 'PASS' : 'FAIL'}`);
console.log(`无 "代码生成完成" 垃圾文本: ${!md.includes('代码生成完成') ? 'PASS' : 'FAIL'}`);

if (hasHtmlCodeBlock && hasCssCodeBlock) {
  console.log('\n所有测试通过！');
} else {
  console.log('\n部分测试失败');
  process.exit(1);
}
