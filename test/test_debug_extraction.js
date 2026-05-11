/**
 * 调试：检查注入的代码块 HTML 格式
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const html = readFileSync('./test/cookie_conversation_test.html', 'utf-8');
const dom = new JSDOM(html);
global.document = dom.window.document;

import { ChatGLMAdapter } from '../src/platforms/chatglm.js';
const adapter = new ChatGLMAdapter();

const item = document.querySelector('.conversation-item');
const thinkingWrap = item.querySelector('[class*="text-advance-thinking"]');

console.log('=== 调试 thinking 代码块提取 ===\n');

// 检查候选元素
const allCandidates = thinkingWrap.querySelectorAll('div[class*="language"]');
console.log(`找到 ${allCandidates.length} 个候选 div:`);

allCandidates.forEach((block, i) => {
  console.log(`\n[${i}] className="${block.className}"`);
  console.log(`    tagName=${block.tagName}`);

  const cls = block.className || '';
  const isCodeBlock = /language\s+language-/.test(cls) || /language-\w+/.test(cls);
  console.log(`    匹配代码块: ${isCodeBlock}`);
});

// 实际提取
const extracted = adapter._extractCodeFromThinking(item);
console.log('\n=== 提取的 HTML ===');
console.log(extracted);
console.log('\n=== 检查 language 模式 ===');
const hasLangPattern = /class="language\s+language-|class="language-\w+/.test(extracted || '');
console.log(`包含 language 模式: ${hasLangPattern}`);
