/**
 * ToolSet Models
 *
 * ToolSet 相关的数据模型。
 * Data models for ToolSet.
 */

import { Status } from "../utils/model";

/**
 * ToolSet schema type
 */
export enum ToolSetSchemaType {
  OPENAPI = "OpenAPI",
  MCP = "MCP",
}

/**
 * ToolSet schema
 */
export interface ToolSetSchema {
  /**
   * Schema type (OpenAPI, MCP)
   */
  type?: ToolSetSchemaType;
  /**
   * Schema detail (URL or inline definition)
   */
  detail?: string;
}

/**
 * ToolSet authorization configuration
 */
export interface ToolSetAuthorization {
  /**
   * Authorization type
   */
  type?: string;
  /**
   * API Key header name
   */
  apiKeyHeaderName?: string;
  /**
   * API Key value
   */
  apiKeyValue?: string;
}

/**
 * ToolSet specification
 */
export interface ToolSetSpec {
  /**
   * Schema configuration
   */
  schema?: ToolSetSchema;
  /**
   * Authorization configuration
   */
  authConfig?: ToolSetAuthorization;
}

/**
 * MCP Tool meta
 */
export interface MCPToolMeta {
  /**
   * Tool name
   */
  name?: string;
  /**
   * Tool description
   */
  description?: string;
}

/**
 * ToolSet status outputs
 */
export interface ToolSetStatusOutputs {
  /**
   * MCP server configuration
   */
  mcpServerConfig?: {
    url?: string;
    transport?: string;
  };
  /**
   * Tools list
   */
  tools?: MCPToolMeta[];
  /**
   * URLs
   */
  urls?: {
    cdpUrl?: string;
    liveViewUrl?: string;
    streamUrl?: string;
  };
}

/**
 * ToolSet status
 */
export interface ToolSetStatus {
  /**
   * Current status
   */
  status?: Status;
  /**
   * Status reason
   */
  statusReason?: string;
  /**
   * Outputs
   */
  outputs?: ToolSetStatusOutputs;
}

/**
 * ToolSet data interface
 */
export interface ToolSetData {
  name?: string;
  uid?: string;
  kind?: string;
  description?: string;
  createdTime?: string;
  generation?: number;
  labels?: Record<string, string>;
  spec?: ToolSetSpec;
  status?: ToolSetStatus;
}

/**
 * ToolSet create input
 */
export interface ToolSetCreateInput {
  /**
   * ToolSet name (required)
   */
  name: string;
  /**
   * Description
   */
  description?: string;
  /**
   * Labels
   */
  labels?: Record<string, string>;
  /**
   * Spec configuration
   */
  spec?: ToolSetSpec;
}

/**
 * ToolSet update input
 */
export interface ToolSetUpdateInput {
  /**
   * Description
   */
  description?: string;
  /**
   * Labels
   */
  labels?: Record<string, string>;
  /**
   * Spec configuration
   */
  spec?: ToolSetSpec;
}

/**
 * ToolSet list input
 */
export interface ToolSetListInput {
  /**
   * Prefix filter
   */
  prefix?: string;
  /**
   * Page size
   */
  pageSize?: number;
  /**
   * Next token for pagination
   */
  nextToken?: string;
  /**
   * Labels filter
   */
  labels?: Record<string, string>;
}

/**
 * JSON Schema compatible tool parameter description
 * 
 * Supports complete JSON Schema fields for describing complex nested data structures.
 * JSON Schema 兼容的工具参数描述
 * 
 * 支持完整的 JSON Schema 字段，能够描述复杂的嵌套数据结构。
 */
export class ToolSchema {
  // Basic fields / 基本字段
  type?: string;
  description?: string;
  title?: string;

  // Object type fields / 对象类型字段
  properties?: Record<string, ToolSchema>;
  required?: string[];
  additionalProperties?: boolean;

  // Array type fields / 数组类型字段
  items?: ToolSchema;
  minItems?: number;
  maxItems?: number;

  // String type fields / 字符串类型字段
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  format?: string; // date, date-time, email, uri, etc.
  enum?: unknown[];

  // Number type fields / 数值类型字段
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;

  // Union types / 联合类型
  anyOf?: ToolSchema[];
  oneOf?: ToolSchema[];
  allOf?: ToolSchema[];

  // Default value / 默认值
  default?: unknown;

  constructor(data?: Partial<ToolSchema>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  /**
   * Create ToolSchema from any OpenAPI/JSON Schema
   * 从任意 OpenAPI/JSON Schema 创建 ToolSchema
   * 
   * Recursively parses all nested structures, preserving complete schema information.
   * 递归解析所有嵌套结构，保留完整的 schema 信息。
   */
  static fromAnyOpenAPISchema(schema: unknown): ToolSchema {
    if (!schema || typeof schema !== 'object') {
      return new ToolSchema({ type: 'string' });
    }

    const s = schema as Record<string, unknown>;

    // Parse properties / 解析 properties
    const propertiesRaw = s.properties as Record<string, unknown> | undefined;
    const properties = propertiesRaw
      ? Object.fromEntries(
          Object.entries(propertiesRaw).map(([key, value]) => [
            key,
            ToolSchema.fromAnyOpenAPISchema(value),
          ])
        )
      : undefined;

    // Parse items / 解析 items
    const itemsRaw = s.items;
    const items = itemsRaw ? ToolSchema.fromAnyOpenAPISchema(itemsRaw) : undefined;

    // Parse union types / 解析联合类型
    const anyOfRaw = s.anyOf as unknown[] | undefined;
    const anyOf = anyOfRaw
      ? anyOfRaw.map(ToolSchema.fromAnyOpenAPISchema)
      : undefined;

    const oneOfRaw = s.oneOf as unknown[] | undefined;
    const oneOf = oneOfRaw
      ? oneOfRaw.map(ToolSchema.fromAnyOpenAPISchema)
      : undefined;

    const allOfRaw = s.allOf as unknown[] | undefined;
    const allOf = allOfRaw
      ? allOfRaw.map(ToolSchema.fromAnyOpenAPISchema)
      : undefined;

    return new ToolSchema({
      // Basic fields
      type: s.type as string | undefined,
      description: s.description as string | undefined,
      title: s.title as string | undefined,
      // Object type
      properties,
      required: s.required as string[] | undefined,
      additionalProperties: s.additionalProperties as boolean | undefined,
      // Array type
      items,
      minItems: s.minItems as number | undefined,
      maxItems: s.maxItems as number | undefined,
      // String type
      pattern: s.pattern as string | undefined,
      minLength: s.minLength as number | undefined,
      maxLength: s.maxLength as number | undefined,
      format: s.format as string | undefined,
      enum: s.enum as unknown[] | undefined,
      // Number type
      minimum: s.minimum as number | undefined,
      maximum: s.maximum as number | undefined,
      exclusiveMinimum: s.exclusiveMinimum as number | undefined,
      exclusiveMaximum: s.exclusiveMaximum as number | undefined,
      // Union types
      anyOf,
      oneOf,
      allOf,
      // Default value
      default: s.default,
    });
  }

  /**
   * Convert to standard JSON Schema format
   * 转换为标准 JSON Schema 格式
   */
  toJSONSchema(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Basic fields / 基本字段
    if (this.type !== undefined) result.type = this.type;
    if (this.description !== undefined) result.description = this.description;
    if (this.title !== undefined) result.title = this.title;

    // Object type / 对象类型
    if (this.properties) {
      result.properties = Object.fromEntries(
        Object.entries(this.properties).map(([k, v]) => [k, v.toJSONSchema()])
      );
    }
    if (this.required) result.required = this.required;
    if (this.additionalProperties !== undefined) {
      result.additionalProperties = this.additionalProperties;
    }

    // Array type / 数组类型
    if (this.items) result.items = this.items.toJSONSchema();
    if (this.minItems !== undefined) result.minItems = this.minItems;
    if (this.maxItems !== undefined) result.maxItems = this.maxItems;

    // String type / 字符串类型
    if (this.pattern) result.pattern = this.pattern;
    if (this.minLength !== undefined) result.minLength = this.minLength;
    if (this.maxLength !== undefined) result.maxLength = this.maxLength;
    if (this.format) result.format = this.format;
    if (this.enum) result.enum = this.enum;

    // Number type / 数值类型
    if (this.minimum !== undefined) result.minimum = this.minimum;
    if (this.maximum !== undefined) result.maximum = this.maximum;
    if (this.exclusiveMinimum !== undefined) {
      result.exclusiveMinimum = this.exclusiveMinimum;
    }
    if (this.exclusiveMaximum !== undefined) {
      result.exclusiveMaximum = this.exclusiveMaximum;
    }

    // Union types / 联合类型
    if (this.anyOf) result.anyOf = this.anyOf.map((s) => s.toJSONSchema());
    if (this.oneOf) result.oneOf = this.oneOf.map((s) => s.toJSONSchema());
    if (this.allOf) result.allOf = this.allOf.map((s) => s.toJSONSchema());

    // Default value / 默认值
    if (this.default !== undefined) result.default = this.default;

    return result;
  }
}

/**
 * Tool information
 * 工具信息
 */
export class ToolInfo {
  name?: string;
  description?: string;
  parameters?: ToolSchema;

  constructor(data?: Partial<ToolInfo>) {
    if (data) {
      this.name = data.name;
      this.description = data.description;
      this.parameters = data.parameters;
    }
  }

  /**
   * Create ToolInfo from MCP tool
   * 从 MCP tool 创建 ToolInfo
   */
  static fromMCPTool(tool: unknown): ToolInfo {
    if (!tool) {
      throw new Error('MCP tool is required');
    }

    let toolName: string | undefined;
    let toolDescription: string | undefined;
    let inputSchema: unknown;

    // Handle MCP Tool object / 处理 MCP Tool 对象
    if (typeof tool === 'object' && tool !== null) {
      const t = tool as Record<string, unknown>;
      
      if ('name' in t) {
        toolName = t.name as string;
        toolDescription = t.description as string | undefined;
        inputSchema = t.inputSchema || t.input_schema;
      } else {
        throw new Error(`Unsupported MCP tool format: ${typeof tool}`);
      }
    } else {
      throw new Error(`Unsupported MCP tool format: ${typeof tool}`);
    }

    if (!toolName) {
      throw new Error('MCP tool must have a name');
    }

    // Build parameters schema / 构建参数 schema
    let parameters: ToolSchema | undefined;
    if (inputSchema) {
      parameters = ToolSchema.fromAnyOpenAPISchema(inputSchema);
    }

    return new ToolInfo({
      name: toolName,
      description: toolDescription,
      parameters: parameters || new ToolSchema({ type: 'object', properties: {} }),
    });
  }
}
