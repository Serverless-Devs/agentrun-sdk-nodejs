#!/usr/bin/env node

/**
 * Auto-inject version check import into all index.ts files
 *
 * This script automatically scans the src directory for index.ts files
 * and adds the version check import at the top of each file (after comments)
 *
 * Usage: node scripts/inject-version-check.mjs
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 要注入的导入语句
const VERSION_CHECK_IMPORT = 'import "@/utils/version-check";';

// 扫描 src 目录下的所有 index.ts 文件
function getIndexFiles(srcDir) {
  const indexFiles = [];
  const basePath = resolve(srcDir);

  function scanDir(dir, relativePath = '') {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // 检查是否有 index.ts 文件
        const indexPath = join(fullPath, 'index.ts');
        try {
          if (statSync(indexPath).isFile()) {
            const filePath = relativePath ? `${relativePath}/${item}/index.ts` : `${item}/index.ts`;
            indexFiles.push(join(srcDir, filePath));
          }
        } catch {
          // index.ts 不存在，继续递归扫描子目录
        }

        // 递归扫描子目录
        const newRelativePath = relativePath ? `${relativePath}/${item}` : item;
        scanDir(fullPath, newRelativePath);
      }
    }
  }

  // 总是包含根目录的 index.ts
  indexFiles.unshift(join(srcDir, 'index.ts'));

  // 扫描 src 目录
  scanDir(basePath);

  return indexFiles;
}

// 检查文件是否已经包含版本检查导入
function hasVersionCheckImport(content) {
  return content.includes('import "@/utils/version-check";') ||
         content.includes("import '@/utils/version-check';");
}

// 为文件添加版本检查导入
function injectVersionCheck(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // 如果已经包含了导入，跳过
  if (hasVersionCheckImport(content)) {
    console.log(`✓ ${filePath} already has version check import`);
    return false;
  }

  const lines = content.split('\n');
  let insertIndex = 0;

  // 找到第一个非注释行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 如果是空行、注释行或 JSDoc 注释，继续
    if (line === '' ||
        line.startsWith('//') ||
        line.startsWith('/*') ||
        line.startsWith('*') ||
        line.startsWith('*/') ||
        line.startsWith('/**')) {
      continue;
    }
    // 找到第一个代码行
    insertIndex = i;
    break;
  }

  // 在第一个代码行之前插入导入
  lines.splice(insertIndex, 0, '', VERSION_CHECK_IMPORT, '');

  const newContent = lines.join('\n');
  writeFileSync(filePath, newContent, 'utf-8');

  console.log(`✓ Injected version check import into ${filePath}`);
  return true;
}

// 主函数
function main() {
  console.log('🔍 Scanning for index.ts files...');

  const indexFiles = getIndexFiles('src');
  console.log(`📁 Found ${indexFiles.length} index.ts files:`);
  indexFiles.forEach(file => console.log(`  - ${file}`));

  console.log('\n🔧 Injecting version check imports...');

  let injectedCount = 0;
  for (const filePath of indexFiles) {
    if (injectVersionCheck(filePath)) {
      injectedCount++;
    }
  }

  console.log(`\n✅ Done! Injected version check into ${injectedCount} files.`);
}

// 运行主函数
main();
