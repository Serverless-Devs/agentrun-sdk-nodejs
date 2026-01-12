import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
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
  ],
  treeshake: true,
  minify: false,
  // ESM output uses .js extension, CJS uses .cjs
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});


