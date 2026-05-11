/**
 * 测试代码块从 thinking 区域提取的功能
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

// 加载测试 HTML
const html = readFileSync('./test/cookie_conversation_test.html', 'utf-8');
const dom = new JSDOM(html);
global.document = dom.window.document;

// 导入平台适配器
import { ChatGLMAdapter } from '../src/platforms/chatglm.js';

const adapter = new ChatGLMAdapter();
const item = document.querySelector('.conversation-item');

console.log('=== 测试：从 thinking 区域提取代码块 ===\n');

const aiMsg = adapter._extractAssistantMessage(item);

if (!aiMsg) {
  console.log('FAIL: AI 回答未提取到任何内容');
  process.exit(1);
}

console.log('提取到的 HTML 内容：');
console.log(aiMsg.contentHtml);
console.log('\n');

// 检查是否包含代码块
const hasHtmlCodeBlock = /language-html|language language-html/.test(aiMsg.contentHtml);
const hasCssCodeBlock = /language-css|language language-css/.test(aiMsg.contentHtml);

console.log('--- 验证结果 ---');
console.log(`HTML 代码块: ${hasHtmlCodeBlock ? 'PASS' : 'FAIL'}`);
console.log(`CSS 代码块: ${hasCssCodeBlock ? 'PASS' : 'FAIL'}`);

if (hasHtmlCodeBlock && hasCssCodeBlock) {
  console.log('\n所有测试通过！thinking 区域的代码块已成功补充到回答中');
} else {
  console.log('\n部分测试失败');
  process.exit(1);
}
