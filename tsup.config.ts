import { defineConfig } from 'tsup';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 自动扫描 src 目录下的所有 index.ts 文件作为入口点
function getEntryPoints(srcDir: string): string[] {
  const entries: string[] = [];
  const basePath = resolve(srcDir);

  function scanDir(dir: string, relativePath = ''): void {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // 检查是否有 index.ts 文件
        const indexPath = join(fullPath, 'index.ts');
        try {
          if (statSync(indexPath).isFile()) {
            const entryPath = relativePath
              ? `${relativePath}/${item}/index.ts`
              : `${item}/index.ts`;
            entries.push(`src/${entryPath}`);
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
  entries.unshift('src/index.ts');

  // 扫描 src 目录
  scanDir(basePath);

  return entries;
}

export default defineConfig({
  entry: getEntryPoints('src'),
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  external: [
    '@ai-sdk/openai',
    '@alicloud/agentrun20250910',
    '@alicloud/devs20230714',
    '@alicloud/openapi-client',
    '@alicloud/tea-util',
    '@modelcontextprotocol/sdk',
    'ai',
    'archiver',
    'crc64-ecma182.js',
    'dotenv',
    'js-yaml',
    'lodash',
    'openai',
    'uuid',
    'zod',
    '@mastra/core',
    'chromium-bidi',
  ],
  treeshake: true,
  minify: false,
  // ESM output uses .js extension, CJS uses .cjs
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  // Define constants to be replaced at build time
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
