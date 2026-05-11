/**
 * 文件下载辅助
 */

/**
 * 下载文件到本地
 * @param {string|Blob} content - 文件内容或 Blob
 * @param {string} filename - 文件名
 * @param {string} [mimeType] - MIME 类型
 */
export function downloadFile(content, filename, mimeType) {
  let blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    const mimeMap = {
      md: 'text/markdown;charset=utf-8',
      html: 'text/html;charset=utf-8',
      txt: 'text/plain;charset=utf-8',
      json: 'application/json;charset=utf-8'
    };
    blob = new Blob([content], { type: mimeType || mimeMap[filename.split('.').pop()] || 'text/plain;charset=utf-8' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * 通过 Chrome API 下载文件（需在 Service Worker 中使用）
 * @param {string} content
 * @param {string} filename
 * @param {string} [mimeType]
 */
export function downloadViaChromeApi(content, filename, mimeType) {
  const mimeMap = {
    md: 'text/markdown;charset=utf-8',
    html: 'text/html;charset=utf-8',
    txt: 'text/plain;charset=utf-8',
    json: 'application/json;charset=utf-8'
  };
  const blob = new Blob([content], { type: mimeType || mimeMap[filename.split('.').pop()] || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  chrome.runtime.sendMessage({
    type: 'DOWNLOAD_FILE',
    url: url,
    filename: filename,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * 生成安全的文件名
 * @param {string} title
 * @param {string} ext - 扩展名（不含点）
 * @returns {string}
 */
export function safeFilename(title, ext = 'md') {
  const safe = title
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 80);
  return `${safe}.${ext}`;
}

/**
 * 生成带日期的文件名
 * @param {string} title
 * @param {string} ext
 * @returns {string}
 */
export function datedFilename(title, ext = 'md') {
  const date = new Date().toISOString().split('T')[0];
  return safeFilename(`${title}_${date}`, ext);
}
