/**
 * HTML 转 Markdown 转换器
 * 专为 AI 对话内容设计，支持代码块、列表、表格、加粗、斜体等
 */

/**
 * 将 HTML 字符串转为纯文本（保留 & 实体）
 */
function stripHtmlTags(htmlStr) {
  return htmlStr
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 将对话 HTML 转换为 Markdown
 * @param {string} htmlStr
 * @returns {string}
 */
export function htmlToMarkdown(htmlStr) {
  let md = htmlStr;

  // 移除无关 UI 元素（在代码块提取之前执行，避免干扰）
  // 代码块顶部的语言标签栏（包含语言名和复制按钮）
  // 结构: <div class="top-outer"><div class="top">...</div></div>
  md = md.replace(/<div[^>]*class="[^"]*top-outer[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
  // Mermaid 渲染容器（包含代码/预览标签和 SVG 渲染区）
  md = md.replace(/<div[^>]*class="[^"]*mermaid-render[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
  // 来源标签容器（在 mermaid/代码底部显示来源数量）
  md = md.replace(/<div[^>]*class="[^"]*sources-tab-container[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
  // 来源引用 span（学术搜索引用等）
  md = md.replace(/<span[^>]*class="[^"]*source-item[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  // SVG Icon 占位
  md = md.replace(/<span[^>]*data-placeholder="svg-icon"[^>]*>\[SVG Icon\]<\/span>/g, '');

  // 提取代码块（language div 包裹 pre）
  const codeBlocks = [];
  md = extractCodeBlocks(md, codeBlocks);

  // 提取 mermaid 图
  const mermaidCount = (md.match(/mermaid-render/g) || []).length;
  md = md.replace(/<div[^>]*class="[^"]*mermaid-render[^"]*"[^>]*>[\s\S]*?<\/div>/g, () => {
    return `__MERMAID_BLOCK__`;
  });

  // 提取 base64 图片
  md = md.replace(/<img[^>]+src="data:image\/(\w+);base64,[^"]+"[^>]*>/g, () => {
    return `__IMAGE_BLOCK__`;
  });
  // 提取 URL 图片
  md = md.replace(/<img[^>]+src="(https?:\/\/[^"]+)"[^>]*>/g, (match, src) => {
    return `![图片](${src})`;
  });

  // 表格
  md = convertTables(md);

  // 标题
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

  // 加粗和斜体
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/g, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/g, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/g, '*$1*');

  // 行内代码
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, (match, content) => {
    if (content.includes('<')) {
      return '`' + stripHtmlTags(content) + '`';
    }
    // 纯文本内容也需要解码 HTML 实体
    return '`' + content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ') + '`';
  });

  // 链接
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)');

  // 换行
  md = md.replace(/<br\s*\/?>/g, '\n');

  // 分隔线
  md = md.replace(/<hr\s*\/?>/g, '\n---\n');

  // 无序列表
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
    return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '- $1') + '\n';
  });

  // 有序列表（支持 start 属性，从内到外处理嵌套）
  md = convertOrderedLists(md);

  // 引用
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, '\n> $1\n');

  // 移除剩余 HTML 标签
  md = md.replace(/<[^>]+>/g, '');

  // 恢复代码块
  codeBlocks.forEach((block, i) => {
    md = md.replace(`__CODE_BLOCK_${i}__`, `\n\`\`\`${block.lang}\n${block.code}\n\`\`\`\n`);
  });

  // 恢复 mermaid 占位
  for (let i = 0; i < mermaidCount; i++) {
    md = md.replace('__MERMAID_BLOCK__', '\n[Mermaid 流程图]\n');
  }

  // 恢复图片占位
  md = md.replace(/__IMAGE_BLOCK__/g, '![图片]');

  // 清理多余文本
  md = md.replace(/复制入框/g, '');
  md = md.replace(/复制\s*/g, '');
  md = md.replace(/代码生成完成/g, '');
  md = md.replace(/(HTML|CSS|JavaScript|Python|Java|Go|C\+\+|Rust)代码/g, '');

  // 清理空白
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

/**
 * 提取代码块并替换为占位符
 * 支持多种 HTML 结构：
 * 1. <div class="language language-go" lang="go"> (智谱清言旧版)
 * 2. <div class="language language-" lang=""> (空语言)
 * 3. <div class="language-bash"> (单一 class 格式)
 * @param {string} md
 * @param {Array<{lang: string, code: string}>} codeBlocks
 * @returns {string} 替换后的字符串
 */
function extractCodeBlocks(md, codeBlocks) {
  let result = '';
  let searchIdx = 0;

  while (searchIdx < md.length) {
    // 尝试多种匹配模式
    // 模式1: class="language language-xxx" 或 class="code-block language language-xxx" (智谱清言格式)
    // 模式2: class="language-xxx" (简化格式，无 language 前缀)
    const patterns = [
      { regex: /class="[^"]*\blanguage\s+language-([^"]*)"/, type: 'dual' },
      { regex: /class="language-(\w+)"/, type: 'single' }
    ];

    let bestMatch = null;
    let bestIdx = md.length;

    // 找最近的一个匹配
    for (const pat of patterns) {
      const subStr = md.substring(searchIdx);
      const match = subStr.match(pat.regex);
      if (match) {
        const absIdx = searchIdx + match.index;
        if (absIdx < bestIdx) {
          bestIdx = absIdx;
          bestMatch = { ...match, patternType: pat.type, absIdx };
        }
      }
    }

    if (!bestMatch) {
      result += md.substring(searchIdx);
      break;
    }

    const langIdx = bestMatch.absIdx;

    // 提取 language 名称
    let lang = bestMatch[1] || '';
    // 空 language 时，尝试从 lang 属性获取
    if (!lang) {
      const langAttrMatch = md.substring(langIdx, langIdx + 200).match(/lang="([^"]*)"/);
      if (langAttrMatch && langAttrMatch[1]) {
        lang = langAttrMatch[1];
      }
    }
    if (!lang) lang = 'text';

    // 找 <pre>
    const preIdx = md.indexOf('<pre', langIdx);
    if (preIdx === -1) {
      const skipLen = bestMatch[0].length;
      result += md.substring(searchIdx, langIdx + skipLen);
      searchIdx = langIdx + skipLen;
      continue;
    }

    // 找匹配的 </pre>，追踪嵌套层级
    let depth = 1;
    let searchPos = preIdx + 4;
    let preCloseIdx = -1;
    while (depth > 0 && searchPos < md.length) {
      const nextOpen = md.indexOf('<pre', searchPos);
      const nextClose = md.indexOf('</pre>', searchPos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 4;
      } else {
        depth--;
        preCloseIdx = nextClose;
        searchPos = nextClose + 6;
      }
    }
    if (preCloseIdx === -1 || depth !== 0) {
      result += md.substring(searchIdx, preIdx);
      searchIdx = preIdx;
      continue;
    }

    // 提取代码内容
    const contentStart = md.indexOf('>', preIdx) + 1;
    let codeContent = md.substring(contentStart, preCloseIdx);
    codeContent = codeContent
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;&amp;/g, '&&')
      .trim();

    // 找到整个 code block 容器的结束
    const divCloseIdx = md.indexOf('</div>', preCloseIdx);
    const blockEnd = divCloseIdx !== -1 ? divCloseIdx + 6 : preCloseIdx + 6;

    // 找到 language div 的开始
    const divStart = md.lastIndexOf('<', langIdx);
    const codeIdx = codeBlocks.length;
    codeBlocks.push({ lang, code: codeContent });

    result += md.substring(searchIdx, divStart);
    result += `__CODE_BLOCK_${codeIdx}__`;
    searchIdx = blockEnd;
  }

  return result;
}

/**
 * 转换表格为 Markdown 表格
 */
function convertTables(html) {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (match, tableHtml) => {
    let tableMd = '\n';
    const rows = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!rows) return match;
    rows.forEach((row, ri) => {
      const cells = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/g);
      if (!cells) return;
      const cellTexts = cells.map(c => {
        return c.replace(/<\/?(td|th)[^>]*>/g, '').trim()
          .replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')
          .replace(/<em>/g, '*').replace(/<\/em>/g, '*');
      });
      tableMd += '| ' + cellTexts.join(' | ') + ' |\n';
      if (ri === 0) tableMd += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
    });
    return tableMd;
  });
}

/**
 * 转换有序列表为 Markdown 列表（从内到外处理嵌套）
 */
function convertOrderedLists(html) {
  // Repeatedly find and convert the innermost <ol> blocks
  let result = html;
  let prev;
  do {
    prev = result;
    result = result.replace(/<ol([^>]*)>(?:(?!<ol[^>]*>)[\s\S])*?<\/ol>/g, (match, attrs) => {
      const startMatch = attrs.match(/start="(\d+)"/);
      let i = startMatch ? parseInt(startMatch[1], 10) : 1;
      return match.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (liMatch, content) => {
        return `${i++}. ${content}`;
      });
    });
  } while (result !== prev);
  return result;
}
