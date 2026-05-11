/**
 * 验证已有代码块模式不被破坏
 */
import { htmlToMarkdown } from '../src/core/htmlToMd.js';

// 测试不同格式的 code block HTML
const testCases = [
  {
    name: '智谱旧版格式 (language language-go)',
    html: `<div class="language language-go" lang="go"><pre><code>package main
import "fmt"
func main() {
    fmt.Println("Hello, World!")
}</code></pre></div>`,
    expected: ['```go', 'package main']
  },
  {
    name: '智谱新版带 code-block 前缀',
    html: `<div class="code-block language language-html" lang="html"><pre><code>&lt;h1&gt;Hello&lt;/h1&gt;</code></pre></div>`,
    expected: ['```html', '<h1>Hello</h1>']
  },
  {
    name: '简化格式 (language-bash)',
    html: `<div class="language-bash"><pre><code>echo "Hello"</code></pre></div>`,
    expected: ['```bash', 'echo "Hello"']
  },
  {
    name: '空 language 从 lang 属性获取',
    html: `<div class="language language-" lang="python"><pre><code>print("Hello")</code></pre></div>`,
    expected: ['```python', 'print("Hello")']
  },
  {
    name: '内联代码实体解码',
    html: `<p>使用 <code>&amp;&amp;</code> 连接</p>`,
    expected: ['`&&`']
  },
  {
    name: '多语言混合',
    html: `<div class="language language-javascript" lang="js"><pre><code>console.log("Hello");</code></pre></div>
<div class="language language-css" lang="css"><pre><code>.foo { color: red; }</code></pre></div>
<div class="language language-python" lang="py"><pre><code>print("hello")</code></pre></div>`,
    expected: ['```javascript', '```css', '```python', 'console.log', 'color: red', 'print']
  }
];

let allPassed = true;

for (const tc of testCases) {
  const md = htmlToMarkdown(tc.html);
  const passed = tc.expected.every(s => md.includes(s));
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${tc.name}`);
  if (!passed) {
    console.log(`  Expected: ${tc.expected.join(', ')}`);
    console.log(`  Got: ${md.substring(0, 200)}`);
    allPassed = false;
  }
}

console.log(`\n${allPassed ? '所有测试通过!' : '部分测试失败'}`);
process.exit(allPassed ? 0 : 1);
