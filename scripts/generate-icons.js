/**
 * 图标生成脚本
 * 运行方式: node scripts/generate-icons.js
 *
 * 需要先安装: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, '../src/assets/icons');

// 简单的 SVG 图标设计（导出/下载图标）
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1890ff" rx="${size * 0.1}"/>
  <path d="M${size * 0.3} ${size * 0.2} h${size * 0.4} v${size * 0.35} h-${size * 0.2} l${size * 0.15} ${size * 0.15} l-${size * 0.15} ${size * 0.15} h${size * 0.2} v${size * 0.15} h-${size * 0.4} v-${size * 0.15} h${size * 0.2} l-${size * 0.15} -${size * 0.15} l${size * 0.15} -${size * 0.15} h-${size * 0.2} z"
        fill="white"
        transform="translate(0, ${size * 0.1})"/>
</svg>
`;

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = createSvgIcon(size);
    const outputPath = path.join(outputDir, `icon${size}.png`);

    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);

      console.log(`Generated: icon${size}.png`);
    } catch (error) {
      console.error(`Failed to generate icon${size}.png:`, error.message);
    }
  }
}

generateIcons().catch(console.error);