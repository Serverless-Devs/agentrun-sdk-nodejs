/**
 * Integration Adapters (Legacy Compatibility)
 * 集成适配器（兼容旧版 API）
 *
 * NOTE:
 * These adapters provide a minimal compatibility layer for legacy tests.
 * They do not require Mastra runtime dependencies.
 */

import type { CanonicalTool, ToolParametersSchema } from './builtin';

export type CanonicalMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface CanonicalToolCall {
  id: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface CanonicalMessage {
  role: CanonicalMessageRole;
  content?: string | null;
  name?: string;
  toolCalls?: CanonicalToolCall[];
  toolCallId?: string;
}

export interface CommonModelConfig {
  endpoint?: string;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MastraToolShape {
  name: string;
  description?: string;
  inputSchema?: ToolParametersSchema;
}

export interface MastraModelConfig {
  provider: string;
  modelId: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  endpoint?: string;
}

/**
 * Convert JSON schema to TypeScript type string
 */
export function schemaToType(schema?: Record<string, unknown>): string {
  if (!schema || typeof schema !== 'object') return 'unknown';

  const type = schema.type as string | undefined;
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array': {
      const items = schema.items as Record<string, unknown> | undefined;
      const itemType = items ? schemaToType(items) : 'unknown';
      return `${itemType}[]`;
    }
    case 'object':
      return 'Record<string, unknown>';
    case 'null':
      return 'null';
    default:
      return 'unknown';
  }
}

/**
 * Mastra Message Adapter
 */
export class MastraMessageAdapter {
  toCanonical(messages: Array<Record<string, unknown>>): CanonicalMessage[] {
    if (!Array.isArray(messages)) return [];

    return messages.map(msg => {
      const role = msg.role as CanonicalMessageRole;
      const content = (msg.content ?? null) as string | null;
      const toolCalls = this.normalizeToolCalls(
        (msg.tool_calls ?? msg.toolCalls) as Array<Record<string, unknown>>
      );

      return {
        role,
        content,
        name: msg.name as string | undefined,
        toolCalls,
        toolCallId: msg.tool_call_id as string | undefined,
      };
    });
  }

  fromCanonical(messages: CanonicalMessage[]): Array<Record<string, unknown>> {
    if (!Array.isArray(messages)) return [];

    return messages.map(msg => ({
      role: msg.role,
      content: msg.content ?? null,
      name: msg.name,
      tool_calls: msg.toolCalls,
      tool_call_id: msg.toolCallId,
    }));
  }

  private normalizeToolCalls(
    toolCalls?: Array<Record<string, unknown>>
  ): CanonicalToolCall[] | undefined {
    if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
      return undefined;
    }

    return toolCalls.map(tc => ({
      id: String(tc.id ?? ''),
      type: (tc.type as string) ?? 'function',
      function: {
        name: String((tc.function as Record<string, unknown>)?.name ?? ''),
        arguments: String((tc.function as Record<string, unknown>)?.arguments ?? ''),
      },
    }));
  }
}

/**
 * Mastra Tool Adapter
 */
export class MastraToolAdapter {
  fromCanonical(tools: CanonicalTool[]): MastraToolShape[] {
    if (!Array.isArray(tools)) return [];
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
  }

  toCanonical(tools: MastraToolShape[]): CanonicalTool[] {
    if (!Array.isArray(tools)) return [];
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description ?? '',
      parameters: this.normalizeSchema(tool.inputSchema),
    }));
  }

  private normalizeSchema(schema?: ToolParametersSchema): ToolParametersSchema {
    if (schema && schema.type === 'object' && schema.properties) {
      return schema;
    }

    return { type: 'object', properties: {} };
  }
}

/**
 * Mastra Model Adapter
 */
export class MastraModelAdapter {
  createModel(config: CommonModelConfig): MastraModelConfig {
    const endpoint = config.endpoint ?? '';
    const provider = this.detectProvider(endpoint);

    return {
      provider,
      modelId: config.modelName ?? 'gpt-4',
      apiKey: config.apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      endpoint: endpoint || undefined,
    };
  }

  private detectProvider(endpoint: string): string {
    if (!endpoint) return 'openai';

    if (endpoint.includes('openai.com')) return 'openai';
    if (endpoint.includes('anthropic.com')) return 'anthropic';
    if (endpoint.includes('dashscope.aliyuncs.com')) return 'dashscope';
    if (endpoint.includes('generativelanguage.googleapis.com')) return 'google';

    return 'openai-compatible';
  }
}

/**
 * Mastra Adapter (aggregates message/tool/model adapters)
 */
export class MastraAdapter {
  name = 'mastra';
  message = new MastraMessageAdapter();
  tool = new MastraToolAdapter();
  model = new MastraModelAdapter();
}

export function createMastraAdapter(): MastraAdapter {
  return new MastraAdapter();
}

export function wrapTools(tools: CanonicalTool[]): MastraToolShape[] {
  return new MastraToolAdapter().fromCanonical(tools);
}

export function wrapModel(config: CommonModelConfig): MastraModelConfig {
  return new MastraModelAdapter().createModel(config);
}
