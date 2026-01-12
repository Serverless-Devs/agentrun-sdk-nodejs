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
    // Exclude auto-generated API control files
    '!src/**/api/control.ts',
    // Exclude server and sandbox modules (as per project requirements)
    '!src/server/**',
    '!src/sandbox/**',
    // Exclude integration modules
    '!src/integration/**',
    // Exclude low-level HTTP client (requires complex network mocking)
    '!src/utils/data-api.ts',
    // Exclude API data layer (thin wrappers around data-api)
    '!src/**/api/data.ts',
    // Exclude OpenAPI parser (requires complex HTTP/schema mocking)
    '!src/toolset/openapi.ts',
    '!src/toolset/api/openapi.ts',
    // Exclude MCP adapter (requires external MCP server)
    '!src/toolset/api/mcp.ts',
    // Exclude agent-runtime model (codeFromFile requires complex fs/archiver mocking)
    '!src/agent-runtime/model.ts',
    // Exclude logging utilities (complex stack frame parsing, not core business logic)
    '!src/utils/log.ts',
    // Exclude toolset.ts (contains complex external SDK client creation and OpenAPI/MCP invocation)
    '!src/toolset/toolset.ts',
    // Exclude agent-runtime client.ts (invokeOpenai method requires Data API client)
    '!src/agent-runtime/client.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json'],
};

