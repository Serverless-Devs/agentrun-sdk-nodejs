#!/usr/bin/env node

/**
 * Auto-generate package.json exports for sub-modules
 *
 * This script automatically scans the src directory for index.ts files
 * and generates the corresponding exports in package.json
 *
 * Usage: node scripts/generate-exports.mjs
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const packageJsonPath = join(projectRoot, 'package.json');

// 扫描 src 目录下的所有 index.ts 文件
function getSubModules(srcDir) {
  const modules = [];
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
            const modulePath = relativePath ? `${relativePath}/${item}` : item;
            modules.push(modulePath);
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

  // 扫描 src 目录
  scanDir(basePath);

  // 过滤出用户可能想要导入的模块
  // 排除一些内部目录，如 api, builtin, adapter, core, protocol, utils
  const excludedDirs = ['api', 'builtin', 'adapter', 'core', 'protocol', 'utils'];
  const mainModules = modules.filter(module => {
    const parts = module.split('/');
    const lastPart = parts[parts.length - 1];
    return !excludedDirs.includes(lastPart);
  });

  return mainModules;
}

// 生成 exports 配置
function generateExports(modules) {
  const exports = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    },
  };

  for (const module of modules) {
    exports[`./${module}`] = {
      types: `./dist/${module}/index.d.ts`,
      import: `./dist/${module}/index.js`,
      require: `./dist/${module}/index.cjs`,
    };
  }

  return exports;
}

// 更新 package.json
function updatePackageJson() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const subModules = getSubModules('src');
  const newExports = generateExports(subModules);

  console.log('Found sub-modules:');
  subModules.forEach(mod => console.log(`  - ${mod}`));

  packageJson.exports = newExports;

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`\nUpdated package.json exports with ${subModules.length} sub-modules`);
}

// 主函数
function main() {
  try {
    updatePackageJson();
    console.log('✅ Exports generation completed successfully');
  } catch (error) {
    console.error('❌ Error generating exports:', error);
    process.exit(1);
  }
}

main();
