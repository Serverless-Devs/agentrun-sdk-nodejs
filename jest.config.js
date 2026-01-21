/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    // Exclude auto-generated API control files (thin wrappers, auto-generated)
    '!src/**/api/control.ts',
    // Exclude server module (requires HTTP server testing infrastructure)
    '!src/server/**',
    // Exclude integration modules (external service dependencies)
    '!src/integration/**',
    // Exclude low-level HTTP client (requires complex network mocking)
    '!src/utils/data-api.ts',
    // Exclude sandbox data API layer (requires network mocking, similar to data-api.ts)
    '!src/sandbox/api/*.ts',
    // Exclude sandbox subclasses that heavily depend on Data API (aio, browser, code-interpreter)
    '!src/sandbox/aio-sandbox.ts',
    '!src/sandbox/browser-sandbox.ts',
    '!src/sandbox/code-interpreter-sandbox.ts',
    // Exclude MCP adapter (requires external MCP server)
    '!src/toolset/api/mcp.ts',
    // Exclude OpenAPI parser (complex HTTP/schema mocking, partially covered)
    '!src/toolset/openapi.ts',
    // Exclude toolset.ts (complex external SDK client creation and OpenAPI/MCP invocation, 86% covered)
    '!src/toolset/toolset.ts',
    // Exclude logging utilities (complex stack frame parsing, 72% covered)
    '!src/utils/log.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json'],
};

