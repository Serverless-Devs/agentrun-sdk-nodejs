/**
 * Integration Adapter Tests
 *
 * 测试框架集成适配器模块。
 * Tests for framework integration adapter modules.
 *
 * TODO: These tests need to be updated to use the new integration API.
 * The old adapter API (MastraAdapter, wrapTools, etc.) has been replaced
 * with a simpler API (model, toolset, sandbox functions).
 */

// @ts-nocheck - Temporarily disable type checking until tests are updated

import {
  // Types
  CanonicalMessage,
  CanonicalTool,
  CommonModelConfig,
  schemaToType,
  // Mastra Adapters
  MastraMessageAdapter,
  MastraToolAdapter,
  MastraModelAdapter,
  MastraAdapter,
  createMastraAdapter,
  wrapTools,
  wrapModel,
} from '../../src/integration';

describe('schemaToType', () => {
  it('should convert string type', () => {
    expect(schemaToType({ type: 'string' })).toBe('string');
  });

  it('should convert number type', () => {
    expect(schemaToType({ type: 'number' })).toBe('number');
  });

  it('should convert integer type', () => {
    expect(schemaToType({ type: 'integer' })).toBe('number');
  });

  it('should convert boolean type', () => {
    expect(schemaToType({ type: 'boolean' })).toBe('boolean');
  });

  it('should convert array type with items', () => {
    expect(schemaToType({ type: 'array', items: { type: 'string' } })).toBe('string[]');
  });

  it('should convert array type without items', () => {
    expect(schemaToType({ type: 'array' })).toBe('unknown[]');
  });

  it('should convert object type', () => {
    expect(schemaToType({ type: 'object' })).toBe('Record<string, unknown>');
  });

  it('should convert null type', () => {
    expect(schemaToType({ type: 'null' })).toBe('null');
  });

  it('should return unknown for undefined schema', () => {
    expect(schemaToType(undefined as unknown as Record<string, unknown>)).toBe('unknown');
  });

  it('should return unknown for unknown type', () => {
    expect(schemaToType({ type: 'custom' })).toBe('unknown');
  });
});

describe('MastraMessageAdapter', () => {
  it('should convert messages to canonical format', () => {
    const adapter = new MastraMessageAdapter();

    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];

    const result = adapter.toCanonical(messages);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('Hello');
    expect(result[1].role).toBe('assistant');
    expect(result[1].content).toBe('Hi there!');
  });

  it('should handle empty message array', () => {
    const adapter = new MastraMessageAdapter();
    const result = adapter.toCanonical([]);
    expect(result).toEqual([]);
  });

  it('should handle system messages', () => {
    const adapter = new MastraMessageAdapter();

    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant.' },
      { role: 'user' as const, content: 'Hello' },
    ];

    const result = adapter.toCanonical(messages);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('system');
  });

  it('should convert messages from canonical format', () => {
    const adapter = new MastraMessageAdapter();

    const canonicalMessages: CanonicalMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    const result = adapter.fromCanonical(canonicalMessages);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('Hello');
  });

  it('should handle tool calls in messages', () => {
    const adapter = new MastraMessageAdapter();

    const messages = [
      {
        role: 'assistant' as const,
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: { name: 'get_weather', arguments: '{"location":"Beijing"}' },
          },
        ],
      },
    ];

    const result = adapter.toCanonical(messages);

    expect(result).toHaveLength(1);
    expect(result[0].toolCalls).toHaveLength(1);
    expect(result[0].toolCalls?.[0].function.name).toBe('get_weather');
  });
});

describe('MastraToolAdapter', () => {
  it('should convert canonical tools to Mastra format', () => {
    const adapter = new MastraToolAdapter();

    const canonicalTools: CanonicalTool[] = [
      {
        name: 'get_weather',
        description: 'Get weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
      },
    ];

    const result = adapter.fromCanonical(canonicalTools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('get_weather');
    expect(result[0].description).toBe('Get weather for a location');
    expect(result[0].inputSchema).toBeDefined();
  });

  it('should handle multiple tools', () => {
    const adapter = new MastraToolAdapter();

    const canonicalTools: CanonicalTool[] = [
      { name: 'tool1', description: 'Tool 1', parameters: {} },
      { name: 'tool2', description: 'Tool 2', parameters: {} },
      { name: 'tool3', description: 'Tool 3', parameters: {} },
    ];

    const result = adapter.fromCanonical(canonicalTools);

    expect(result).toHaveLength(3);
    expect(result.map(t => t.name)).toEqual(['tool1', 'tool2', 'tool3']);
  });

  it('should handle empty tools array', () => {
    const adapter = new MastraToolAdapter();
    const result = adapter.fromCanonical([]);
    expect(result).toEqual([]);
  });

  it('should convert Mastra tools to canonical format', () => {
    const adapter = new MastraToolAdapter();

    const mastraTools = [
      {
        name: 'get_weather',
        description: 'Get weather',
        inputSchema: { type: 'object' },
      },
    ];

    const result = adapter.toCanonical(mastraTools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('get_weather');
    expect(result[0].parameters).toEqual({ type: 'object', properties: {} });
  });
});

describe('MastraModelAdapter', () => {
  it('should create Mastra model config from common config', () => {
    const adapter = new MastraModelAdapter();

    const commonConfig: CommonModelConfig = {
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      modelName: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    };

    const result = adapter.createModel(commonConfig);

    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4');
    expect(result.apiKey).toBe('sk-test');
    expect(result.temperature).toBe(0.7);
    expect(result.maxTokens).toBe(1000);
  });

  it('should detect OpenAI provider', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({ endpoint: 'https://api.openai.com' });
    expect(config.provider).toBe('openai');
  });

  it('should detect Anthropic provider', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({ endpoint: 'https://api.anthropic.com' });
    expect(config.provider).toBe('anthropic');
  });

  it('should detect DashScope provider', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({ endpoint: 'https://dashscope.aliyuncs.com' });
    expect(config.provider).toBe('dashscope');
  });

  it('should detect Google provider', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({ endpoint: 'https://generativelanguage.googleapis.com' });
    expect(config.provider).toBe('google');
  });

  it('should default to openai-compatible for unknown endpoints', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({ endpoint: 'https://custom.model.endpoint' });
    expect(config.provider).toBe('openai-compatible');
  });

  it('should default to openai when no endpoint', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({});
    expect(config.provider).toBe('openai');
  });

  it('should use default model name when not specified', () => {
    const adapter = new MastraModelAdapter();
    const config = adapter.createModel({});
    expect(config.modelId).toBe('gpt-4');
  });
});

describe('MastraAdapter', () => {
  it('should have name property', () => {
    const adapter = new MastraAdapter();
    expect(adapter.name).toBe('mastra');
  });

  it('should have message adapter', () => {
    const adapter = new MastraAdapter();
    expect(adapter.message).toBeInstanceOf(MastraMessageAdapter);
  });

  it('should have tool adapter', () => {
    const adapter = new MastraAdapter();
    expect(adapter.tool).toBeInstanceOf(MastraToolAdapter);
  });

  it('should have model adapter', () => {
    const adapter = new MastraAdapter();
    expect(adapter.model).toBeInstanceOf(MastraModelAdapter);
  });
});

describe('createMastraAdapter', () => {
  it('should create a MastraAdapter instance', () => {
    const adapter = createMastraAdapter();
    expect(adapter).toBeInstanceOf(MastraAdapter);
    expect(adapter.name).toBe('mastra');
  });
});

describe('wrapTools', () => {
  it('should wrap canonical tools to Mastra format', () => {
    const tools: CanonicalTool[] = [
      { name: 'test_tool', description: 'A test tool', parameters: {} },
    ];

    const result = wrapTools(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test_tool');
  });
});

describe('wrapModel', () => {
  it('should convert common model config to Mastra config', () => {
    const config: CommonModelConfig = {
      modelName: 'gpt-4o',
      apiKey: 'test-key',
    };

    const result = wrapModel(config);

    expect(result.modelId).toBe('gpt-4o');
    expect(result.apiKey).toBe('test-key');
  });
});
