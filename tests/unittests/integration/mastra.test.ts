/**
 * Mastra Integration Tests
 *
 * 测试 Mastra 框架集成功能。
 * Tests for Mastra framework integration functions.
 *
 * This test suite validates the new functional API for Mastra integration.
 */

import {
  model,
  toolset,
  sandbox,
  codeInterpreter,
  browser,
  createMastraTool,
} from '@/integration/mastra';
import { TemplateType } from '@/sandbox';
import { Config } from '@/utils/config';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { z } from 'zod';
import type { ToolsInput } from '@mastra/core/agent';

// Mock external dependencies
jest.mock('@/integration/builtin');
jest.mock('@ai-sdk/openai-compatible');
jest.mock('@mastra/core/tools', () => ({
  createTool: jest.fn(),
}));

// Import mocked modules
import * as builtin from '@/integration/builtin';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

describe('Mastra Integration', () => {
  let mockConfig: Config;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = new Config({
      accessKeyId: 'test-key',
      accessKeySecret: 'test-secret',
    });
  });

  describe('model()', () => {
    it('should create LanguageModelV3 from model name', async () => {
      // Mock CommonModel
      const mockCommonModel = {
        getModelInfo: jest.fn().mockResolvedValue({
          model: 'qwen-max',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          apiKey: 'test-api-key',
          headers: {},
        }),
      };

      // Mock builtin.model
      (builtin.model as jest.Mock).mockResolvedValue(mockCommonModel);

      // Mock createOpenAICompatible
      const mockProvider = jest.fn(() => ({
        // Mock LanguageModelV3
        modelId: 'qwen-max',
        provider: 'qwen',
      }));
      (createOpenAICompatible as jest.Mock).mockReturnValue(mockProvider);

      // Call model function
      const result = await model({
        name: 'qwen-max',
      });

      // Verify
      expect(builtin.model).toHaveBeenCalledWith('qwen-max', {
        model: undefined,
        config: undefined,
      });
      expect(mockCommonModel.getModelInfo).toHaveBeenCalled();
      expect(createOpenAICompatible).toHaveBeenCalledWith({
        name: 'qwen-max',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: 'test-api-key',
        headers: {},
      });
      expect(mockProvider).toHaveBeenCalledWith('qwen-max');
      expect(result).toBeDefined();
    });

    it('should use specific model name when provided', async () => {
      // Mock CommonModel
      const mockCommonModel = {
        getModelInfo: jest.fn().mockResolvedValue({
          model: 'qwen-turbo',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          apiKey: 'test-api-key',
          headers: {},
        }),
      };

      (builtin.model as jest.Mock).mockResolvedValue(mockCommonModel);
      const mockProvider = jest.fn(() => ({ modelId: 'qwen-turbo' }));
      (createOpenAICompatible as jest.Mock).mockReturnValue(mockProvider);

      await model({
        name: 'my-model-service',
        modelName: 'qwen-turbo',
      });

      expect(builtin.model).toHaveBeenCalledWith('my-model-service', {
        model: 'qwen-turbo',
        config: undefined,
      });
    });

    it('should use custom config', async () => {
      const mockCommonModel = {
        getModelInfo: jest.fn().mockResolvedValue({
          model: 'qwen-max',
          baseUrl: 'https://example.com',
          apiKey: 'custom-key',
          headers: {},
        }),
      };

      (builtin.model as jest.Mock).mockResolvedValue(mockCommonModel);
      const mockProvider = jest.fn(() => ({ modelId: 'qwen-max' }));
      (createOpenAICompatible as jest.Mock).mockReturnValue(mockProvider);

      await model({
        name: 'qwen-max',
        config: mockConfig,
      });

      expect(builtin.model).toHaveBeenCalledWith('qwen-max', {
        model: undefined,
        config: mockConfig,
      });
      expect(mockCommonModel.getModelInfo).toHaveBeenCalledWith(mockConfig);
    });

    it('should handle model info retrieval', async () => {
      const mockModelInfo = {
        model: 'custom-model',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'secret-key',
        headers: { 'X-Custom-Header': 'value' },
      };

      const mockCommonModel = {
        getModelInfo: jest.fn().mockResolvedValue(mockModelInfo),
      };

      (builtin.model as jest.Mock).mockResolvedValue(mockCommonModel);
      const mockProvider = jest.fn(() => ({ modelId: 'custom-model' }));
      (createOpenAICompatible as jest.Mock).mockReturnValue(mockProvider);

      await model({ name: 'my-model' });

      expect(createOpenAICompatible).toHaveBeenCalledWith({
        name: 'custom-model',
        baseURL: mockModelInfo.baseUrl,
        apiKey: mockModelInfo.apiKey,
        headers: mockModelInfo.headers,
      });
    });
  });

  describe('toolset()', () => {
    it('should convert ToolSet to Mastra tools', async () => {
      // Mock CommonToolSet
      const mockTool1 = {
        name: 'tool1',
        description: 'Tool 1 description',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        },
        func: jest.fn().mockResolvedValue({ result: 'success' }),
      };

      const mockToolSet = {
        tools: jest.fn().mockReturnValue([mockTool1]),
      };

      (builtin.toolset as jest.Mock).mockResolvedValue(mockToolSet);

      // Mock createTool from @mastra/core/tools
      const { createTool } = await import('@mastra/core/tools');
      (createTool as jest.Mock).mockImplementation(params => params);

      // Call toolset function
      const result = await toolset({
        name: 'my-toolset',
      });

      // Verify
      expect(builtin.toolset).toHaveBeenCalledWith('my-toolset', undefined);
      expect(mockToolSet.tools).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.tool1).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.tool1 as any).id).toBe('tool1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.tool1 as any).description).toBe('Tool 1 description');
    });

    it('should handle custom config', async () => {
      const mockToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.toolset as jest.Mock).mockResolvedValue(mockToolSet);

      await toolset({
        name: 'my-toolset',
        config: mockConfig,
      });

      expect(builtin.toolset).toHaveBeenCalledWith('my-toolset', mockConfig);
    });

    it('should return ToolsInput compatible with Mastra', async () => {
      const mockTool = {
        name: 'testTool',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {},
        },
        func: jest.fn(),
      };

      const mockToolSet = {
        tools: jest.fn().mockReturnValue([mockTool]),
      };

      (builtin.toolset as jest.Mock).mockResolvedValue(mockToolSet);

      const { createTool } = await import('@mastra/core/tools');
      (createTool as jest.Mock).mockImplementation(params => params);

      const result = await toolset({ name: 'test' });

      // Verify result is ToolsInput format (Record<string, MastraTool>)
      expect(typeof result).toBe('object');
      expect(result.testTool).toBeDefined();
    });
  });

  describe('sandbox()', () => {
    it('should create sandbox tools with template name', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await sandbox({
        templateName: 'my-template',
        templateType: TemplateType.CODE_INTERPRETER,
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('my-template', {
        templateType: TemplateType.CODE_INTERPRETER,
        sandboxIdleTimeoutSeconds: undefined,
        config: undefined,
      });
    });

    it('should use specified template type', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await sandbox({
        templateName: 'browser-template',
        templateType: TemplateType.BROWSER,
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('browser-template', {
        templateType: TemplateType.BROWSER,
        sandboxIdleTimeoutSeconds: undefined,
        config: undefined,
      });
    });

    it('should set idle timeout', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await sandbox({
        templateName: 'my-template',
        sandboxIdleTimeoutSeconds: 600,
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('my-template', {
        templateType: undefined,
        sandboxIdleTimeoutSeconds: 600,
        config: undefined,
      });
    });

    it('should use custom config', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await sandbox({
        templateName: 'my-template',
        config: mockConfig,
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('my-template', {
        templateType: undefined,
        sandboxIdleTimeoutSeconds: undefined,
        config: mockConfig,
      });
    });
  });

  describe('codeInterpreter()', () => {
    it('should create CODE_INTERPRETER sandbox tools', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await codeInterpreter({
        templateName: 'code-template',
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('code-template', {
        templateType: TemplateType.CODE_INTERPRETER,
        sandboxIdleTimeoutSeconds: undefined,
        config: undefined,
      });
    });

    it('should be shorthand for sandbox()', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await codeInterpreter({
        templateName: 'test-template',
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });

      await sandbox({
        templateName: 'test-template',
        templateType: TemplateType.CODE_INTERPRETER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });

      // Should call with same parameters
      expect(builtin.sandboxToolset).toHaveBeenCalledTimes(2);
      expect(builtin.sandboxToolset).toHaveBeenNthCalledWith(1, 'test-template', {
        templateType: TemplateType.CODE_INTERPRETER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });
      expect(builtin.sandboxToolset).toHaveBeenNthCalledWith(2, 'test-template', {
        templateType: TemplateType.CODE_INTERPRETER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });
    });
  });

  describe('browser()', () => {
    it('should create BROWSER sandbox tools', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await browser({
        templateName: 'browser-template',
      });

      expect(builtin.sandboxToolset).toHaveBeenCalledWith('browser-template', {
        templateType: TemplateType.BROWSER,
        sandboxIdleTimeoutSeconds: undefined,
        config: undefined,
      });
    });

    it('should be shorthand for sandbox()', async () => {
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([]),
      };

      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      await browser({
        templateName: 'test-browser',
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });

      await sandbox({
        templateName: 'test-browser',
        templateType: TemplateType.BROWSER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });

      // Should call with same parameters
      expect(builtin.sandboxToolset).toHaveBeenCalledTimes(2);
      expect(builtin.sandboxToolset).toHaveBeenNthCalledWith(1, 'test-browser', {
        templateType: TemplateType.BROWSER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });
      expect(builtin.sandboxToolset).toHaveBeenNthCalledWith(2, 'test-browser', {
        templateType: TemplateType.BROWSER,
        sandboxIdleTimeoutSeconds: 300,
        config: mockConfig,
      });
    });
  });

  describe('createMastraTool()', () => {
    it('should create Mastra tool from definition', async () => {
      // Mock createTool from @mastra/core/tools
      const { createTool } = await import('@mastra/core/tools');
      const mockToolDefinition = {
        id: 'custom-tool',
        description: 'Custom tool description',
        inputSchema: z.object({}),
        execute: jest.fn(),
      };
      (createTool as jest.Mock).mockResolvedValue(mockToolDefinition);

      const result = await createMastraTool(mockToolDefinition);

      expect(createTool).toHaveBeenCalledWith(mockToolDefinition);
      expect(result).toEqual(mockToolDefinition);
    });

    it('should wrap execute function', async () => {
      const { createTool } = await import('@mastra/core/tools');
      const executeFn = jest.fn().mockResolvedValue({ result: 'success' });
      const toolDef = {
        id: 'test-tool',
        description: 'Test',
        inputSchema: z.object({}),
        execute: executeFn,
      };

      (createTool as jest.Mock).mockImplementation(params => params);

      const result = await createMastraTool(toolDef);

      expect(result.id).toBe('test-tool');
      expect(result.execute).toBe(executeFn);
    });
  });

  describe('Integration Example', () => {
    it('should work with complete Mastra workflow', async () => {
      // Setup mocks for model
      const mockCommonModel = {
        getModelInfo: jest.fn().mockResolvedValue({
          model: 'qwen-max',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          apiKey: 'test-key',
          headers: {},
        }),
      };
      (builtin.model as jest.Mock).mockResolvedValue(mockCommonModel);
      const mockProvider = jest.fn(() => ({ modelId: 'qwen-max' }));
      (createOpenAICompatible as jest.Mock).mockReturnValue(mockProvider);

      // Setup mocks for toolset
      const mockTool = {
        name: 'weatherTool',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
        func: jest.fn(),
      };
      const mockToolSet = {
        tools: jest.fn().mockReturnValue([mockTool]),
      };
      (builtin.toolset as jest.Mock).mockResolvedValue(mockToolSet);

      // Setup mocks for sandbox
      const mockSandboxTool = {
        name: 'executeCode',
        description: 'Execute code',
        parameters: { type: 'object', properties: {} },
        func: jest.fn(),
      };
      const mockSandboxToolSet = {
        tools: jest.fn().mockReturnValue([mockSandboxTool]),
      };
      (builtin.sandboxToolset as jest.Mock).mockResolvedValue(mockSandboxToolSet);

      const { createTool } = await import('@mastra/core/tools');
      (createTool as jest.Mock).mockImplementation(params => params);

      // Create all components
      const llm = await model({ name: 'qwen-max' });
      const tools = await toolset({ name: 'weather-toolset' });
      const sandboxTools = await codeInterpreter({
        templateName: 'python-sandbox',
      });

      // Verify all components are created
      expect(llm).toBeDefined();
      expect(tools).toBeDefined();
      expect(tools.weatherTool).toBeDefined();
      expect(sandboxTools).toBeDefined();
      expect(sandboxTools.executeCode).toBeDefined();

      // Verify component structure
      expect(typeof tools).toBe('object');
      expect(typeof sandboxTools).toBe('object');
    });
  });
});
