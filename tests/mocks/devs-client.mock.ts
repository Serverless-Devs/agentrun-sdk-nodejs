/**
 * DevS Client Mock
 *
 * 模拟阿里云 DevS SDK 的行为，用于 ToolSet 相关测试。
 * Mock for Alibaba Cloud DevS SDK, used for ToolSet related tests.
 */

import { getMockStore, resetMockStore } from './store';

/**
 * Mock DevS Client interface
 */
export interface MockDevsClient {
  createToolsetWithOptions: jest.Mock;
  deleteToolsetWithOptions: jest.Mock;
  updateToolsetWithOptions: jest.Mock;
  getToolsetWithOptions: jest.Mock;
  listToolsetsWithOptions: jest.Mock;
  invokeToolWithOptions: jest.Mock;
  listToolsWithOptions: jest.Mock;
}

/**
 * Create a mock DevS client with default implementations
 */
export function createMockDevsClient(): MockDevsClient {
  const store = getMockStore();

  return {
    createToolsetWithOptions: jest.fn().mockImplementation(async (request: any) => {
      const toolset = store.createToolSet({
        name: request.name,
        description: request.description,
        spec: request.spec,
      });
      return {
        body: { ...toolset },
      };
    }),

    deleteToolsetWithOptions: jest.fn().mockImplementation(async (name: string) => {
      const toolset = store.getToolSetByName(name);
      if (!toolset) {
        const error = new Error('ToolSet not found');
        (error as any).code = 'NotFound.Toolset';
        (error as any).statusCode = 404;
        throw error;
      }
      store.toolsets.delete(name);
      return {
        body: { ...toolset },
      };
    }),

    updateToolsetWithOptions: jest.fn().mockImplementation(async (name: string, request: any) => {
      const toolset = store.getToolSetByName(name);
      if (!toolset) {
        const error = new Error('ToolSet not found');
        (error as any).code = 'NotFound.Toolset';
        (error as any).statusCode = 404;
        throw error;
      }
      Object.assign(toolset, request);
      return {
        body: { ...toolset },
      };
    }),

    getToolsetWithOptions: jest.fn().mockImplementation(async (name: string) => {
      const toolset = store.getToolSetByName(name);
      if (!toolset) {
        const error = new Error('ToolSet not found');
        (error as any).code = 'NotFound.Toolset';
        (error as any).statusCode = 404;
        throw error;
      }
      return {
        body: { ...toolset },
      };
    }),

    listToolsetsWithOptions: jest.fn().mockImplementation(async (request: any) => {
      const items = Array.from(store.toolsets.values());
      return {
        body: {
          items,
          nextToken: undefined,
        },
      };
    }),

    invokeToolWithOptions: jest
      .fn()
      .mockImplementation(async (toolsetName: string, toolName: string, request: any) => {
        return {
          body: {
            result: { success: true, output: 'Mock tool output' },
          },
        };
      }),

    listToolsWithOptions: jest.fn().mockImplementation(async (toolsetName: string) => {
      return {
        body: {
          items: [
            { name: 'tool1', description: 'First tool' },
            { name: 'tool2', description: 'Second tool' },
          ],
        },
      };
    }),
  };
}

/**
 * Setup DevS client mock
 *
 * Returns a mock client and sets up jest.mock for the DevS SDK module
 */
export function setupDevsClientMock(): MockDevsClient {
  resetMockStore();
  return createMockDevsClient();
}

/**
 * Create DevS SDK mock factory
 *
 * Returns an object that can be used with jest.mock('@alicloud/devs20230714')
 */
export function createDevsSdkMock(mockClient: MockDevsClient) {
  return {
    default: {
      default: jest.fn().mockImplementation(() => mockClient),
    },
    Toolset: jest.fn().mockImplementation((data: any) => data),
    ToolsetSpec: jest.fn().mockImplementation((data: any) => data),
    ToolsetSchema: jest.fn().mockImplementation((data: any) => data),
    Authorization: jest.fn().mockImplementation((data: any) => data),
    AuthorizationParameters: jest.fn().mockImplementation((data: any) => data),
    APIKeyAuthParameter: jest.fn().mockImplementation((data: any) => data),
    CreateToolsetRequest: jest.fn().mockImplementation((data: any) => data),
    UpdateToolsetRequest: jest.fn().mockImplementation((data: any) => data),
    GetToolsetRequest: jest.fn().mockImplementation((data: any) => data),
    ListToolsetsRequest: jest.fn().mockImplementation((data: any) => data),
    DeleteToolsetRequest: jest.fn().mockImplementation((data: any) => data),
    InvokeToolRequest: jest.fn().mockImplementation((data: any) => data),
    ListToolsRequest: jest.fn().mockImplementation((data: any) => data),
  };
}
