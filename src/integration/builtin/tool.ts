/**
 * Common Tool Definition and Conversion Module
 *
 * Provides cross-framework tool definition and conversion capabilities.
 * 提供跨框架的通用工具定义和转换功能。
 */

import crypto from 'crypto';
import type { ToolSet } from '@/toolset';
import type { Config } from '@/utils/config';
import { logger } from '@/utils/log';

// Tool name constraints for external providers like OpenAI
const MAX_TOOL_NAME_LEN = 64;
const TOOL_NAME_HEAD_LEN = 32;

/**
 * Normalize a tool name to fit provider limits.
 * If name length is <= MAX_TOOL_NAME_LEN, return it unchanged.
 * Otherwise, return the first TOOL_NAME_HEAD_LEN characters + md5(full_name).
 */
export function normalizeToolName(name: string): string {
  if (typeof name !== 'string') {
    name = String(name);
  }
  if (name.length <= MAX_TOOL_NAME_LEN) {
    return name;
  }
  const digest = crypto.createHash('md5').update(name).digest('hex');
  return name.substring(0, TOOL_NAME_HEAD_LEN) + digest;
}

/**
 * Tool Parameter Definition
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  paramType: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  format?: string;
  nullable?: boolean;
}

/**
 * JSON Schema for tool parameters
 */
export interface ToolParametersSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

/**
 * Tool execution function type
 */
export type ToolFunction = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Tool Definition
 * 工具定义
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  func?: ToolFunction;
}

/**
 * Common Tool class
 * 通用工具类
 */
export class Tool implements ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  func?: ToolFunction;

  constructor(options: {
    name: string;
    description?: string;
    parameters?: ToolParametersSchema;
    func?: ToolFunction;
  }) {
    this.name = normalizeToolName(options.name);
    this.description = options.description || '';
    this.parameters = options.parameters || { type: 'object', properties: {} };
    this.func = options.func;
  }

  /**
   * Get parameters as JSON Schema
   */
  getParametersSchema(): ToolParametersSchema {
    return this.parameters;
  }

  /**
   * Convert to OpenAI Function Calling format
   */
  toOpenAIFunction(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      parameters: this.getParametersSchema(),
    };
  }

  /**
   * Convert to Anthropic Claude Tools format
   */
  toAnthropicTool(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.getParametersSchema(),
    };
  }

  /**
   * Execute the tool
   */
  async call(...args: unknown[]): Promise<unknown> {
    if (!this.func) {
      throw new Error(`Tool '${this.name}' has no function implementation`);
    }
    return this.func(...args);
  }

  /**
   * Bind tool to an instance (for class methods)
   */
  bind(instance: unknown): Tool {
    if (!this.func) {
      throw new Error(`Tool '${this.name}' has no function implementation`);
    }

    const originalFunc = this.func;
    const boundFunc = (...args: unknown[]) =>
      originalFunc.call(instance, ...args);

    return new Tool({
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      func: boundFunc,
    });
  }
}

/**
 * Canonical Tool representation for cross-framework conversion
 */
export interface CanonicalTool {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  func?: ToolFunction;
}

/**
 * Common ToolSet class
 * 通用工具集类
 *
 * Manages multiple tools and provides batch conversion capabilities.
 */
export class CommonToolSet {
  protected name: string;
  protected _tools: Tool[];

  constructor(name?: string, tools?: Tool[]) {
    this.name = name || '';
    this._tools = tools || this._collectDeclaredTools();
  }

  /**
   * Collect declared tools from subclass
   */
  protected _collectDeclaredTools(): Tool[] {
    const tools: Tool[] = [];
    const seen = new Set<string>();

    // Get all property names from prototype chain
    let proto = Object.getPrototypeOf(this);
    while (proto && proto !== Object.prototype) {
      const descriptors = Object.getOwnPropertyDescriptors(proto);
      for (const [name, descriptor] of Object.entries(descriptors)) {
        if (name.startsWith('_') || seen.has(name)) continue;
        const value = descriptor.value;
        if (value instanceof Tool) {
          seen.add(name);
          tools.push(value.bind(this));
        }
      }
      proto = Object.getPrototypeOf(proto);
    }

    // Also check instance properties
    for (const [name, value] of Object.entries(this)) {
      if (name.startsWith('_') || seen.has(name)) continue;
      if (value instanceof Tool) {
        seen.add(name);
        tools.push(value.bind(this));
      }
    }

    return tools;
  }

  /**
   * Get tools with optional filtering and modification
   */
  tools(options?: {
    prefix?: string;
    filterByName?: (name: string) => boolean;
    modifyTool?: (tool: Tool) => Tool;
  }): CanonicalTool[] {
    let tools = [...this._tools];

    // Apply filter
    if (options?.filterByName) {
      tools = tools.filter((t) => options.filterByName!(t.name));
    }

    // Apply prefix
    const prefix = options?.prefix || this.name;
    tools = tools.map(
      (t) =>
        new Tool({
          name: `${prefix}_${t.name}`,
          description: t.description,
          parameters: t.parameters,
          func: t.func,
        }),
    );

    // Apply modification
    if (options?.modifyTool) {
      tools = tools.map(options.modifyTool);
    }

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.getParametersSchema(),
      func: tool.func,
    }));
  }

  /**
   * Create CommonToolSet from AgentRun ToolSet
   */
  static async fromAgentRunToolSet(
    toolset: ToolSet,
    config?: Config,
  ): Promise<CommonToolSet> {
    const toolsMeta = (await toolset.listTools(config)) || [];
    const tools: Tool[] = [];
    const seenNames = new Set<string>();

    for (const meta of toolsMeta) {
      const tool = buildToolFromMeta(toolset, meta, config);
      if (tool) {
        if (seenNames.has(tool.name)) {
          logger.warn(
            `Duplicate tool name '${tool.name}' detected, skipping second occurrence`,
          );
          continue;
        }
        seenNames.add(tool.name);
        tools.push(tool);
      }
    }

    return new CommonToolSet(toolset.name, tools);
  }

  /**
   * Convert to OpenAI Function Calling format
   */
  toOpenAIFunctions(options?: {
    prefix?: string;
    filterByName?: (name: string) => boolean;
  }): Record<string, unknown>[] {
    return this.tools(options).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Convert to Anthropic Claude Tools format
   */
  toAnthropicTools(options?: {
    prefix?: string;
    filterByName?: (name: string) => boolean;
  }): Record<string, unknown>[] {
    return this.tools(options).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Close and release resources
   */
  close(): void {
    // Override in subclass if needed
  }
}

/**
 * Build Tool from metadata
 */
function buildToolFromMeta(
  toolset: ToolSet,
  meta: Record<string, unknown>,
  config?: Config,
): Tool | null {
  const toolName =
    (meta.name as string) ||
    (meta.operationId as string) ||
    (meta.tool_id as string);

  if (!toolName) {
    return null;
  }

  const description =
    (meta.description as string) ||
    (meta.summary as string) ||
    `${meta.method || ''} ${meta.path || ''}`.trim() ||
    '';

  const parameters = buildParametersSchema(meta);

  const func = async (args: unknown) => {
    logger.debug(`Invoking tool ${toolName} with arguments:`, args);
    const result = await toolset.callTool(
      toolName,
      args as Record<string, unknown>,
      config,
    );
    logger.debug(`Tool ${toolName} returned:`, result);
    return result;
  };

  return new Tool({
    name: toolName,
    description,
    parameters,
    func,
  });
}

/**
 * Build parameters schema from metadata
 */
function buildParametersSchema(
  meta: Record<string, unknown>,
): ToolParametersSchema {
  // Handle ToolSchema format (from ToolInfo)
  if (meta.parameters && typeof meta.parameters === 'object') {
    const params = meta.parameters as Record<string, unknown>;
    if (params.type === 'object' && params.properties) {
      return {
        type: 'object',
        properties: params.properties as Record<string, unknown>,
        required: params.required as string[] | undefined,
      };
    }
  }

  // Handle MCP format (input_schema)
  if (meta.input_schema && typeof meta.input_schema === 'object') {
    const schema = meta.input_schema as Record<string, unknown>;
    return {
      type: 'object',
      properties: (schema.properties as Record<string, unknown>) || {},
      required: schema.required as string[] | undefined,
    };
  }

  // Handle OpenAPI format (parameters array)
  if (Array.isArray(meta.parameters)) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of meta.parameters) {
      if (typeof param !== 'object' || !param) continue;
      const p = param as Record<string, unknown>;
      const name = p.name as string;
      if (!name) continue;

      const schema = (p.schema as Record<string, unknown>) || {};
      properties[name] = {
        ...schema,
        description:
          (p.description as string) || (schema.description as string) || '',
      };

      if (p.required) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Default empty schema
  return { type: 'object', properties: {} };
}

/**
 * Tool decorator factory
 * Creates a Tool from a method definition
 */
export function tool(options: {
  name?: string;
  description?: string;
  parameters?: ToolParametersSchema;
}): (
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const toolName = options.name || propertyKey;
    const toolDescription = options.description || '';

    // Create a Tool instance
    const toolInstance = new Tool({
      name: toolName,
      description: toolDescription,
      parameters: options.parameters,
      func: originalMethod,
    });

    // Replace the method with the Tool
    descriptor.value = toolInstance;
    return descriptor;
  };
}
