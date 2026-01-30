/**
 * OpenAPI Protocol Handler
 *
 * 处理 OpenAPI 规范的工具解析和调用。
 * Handles tool parsing and invocation for OpenAPI specification.
 */

import { Config } from '../utils/config';
import { logger } from '../utils/log';
import YAML from 'js-yaml';

/**
 * Tool parameter schema
 */
export interface ToolParameterSchema {
  type?: string;
  description?: string;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
  items?: ToolParameterSchema;
  enum?: unknown[];
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Tool information
 */
export interface ToolInfo {
  name: string;
  description?: string;
  parameters?: ToolParameterSchema;
  operationId?: string;
  method?: string;
  path?: string;
}

/**
 * Invoke result
 */
export interface InvokeResult {
  status_code: number;
  headers?: Record<string, string>;
  body?: unknown;
  error?: string;
}

/**
 * OpenAPI handler options
 */
export interface OpenAPIOptions {
  /** OpenAPI schema (JSON string or object) */
  schema: string | Record<string, unknown>;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Default headers for all requests */
  headers?: Record<string, string>;
  /** Default query parameters */
  queryParams?: Record<string, string>;
  /** Configuration */
  config?: Config;
}

/**
 * OpenAPI Handler class
 *
 * Parses OpenAPI schema and provides tool invocation capabilities.
 */
export class OpenAPI {
  private _schema: Record<string, unknown>;
  private _baseUrl: string;
  private _defaultHeaders: Record<string, string>;
  private _defaultQueryParams: Record<string, string>;
  private _config?: Config;
  private _tools: Map<string, ToolInfo> = new Map();

  constructor(options: OpenAPIOptions) {
    // Parse schema if it's a string
    if (typeof options.schema === 'string') {
      // Try to parse as YAML first (since OpenAPI specs are often in YAML)
      try {
        this._schema = YAML.load(options.schema) as Record<string, unknown>;
      } catch {
        // If YAML parsing fails, try JSON
        this._schema = JSON.parse(options.schema);
      }
    } else {
      this._schema = JSON.parse(JSON.stringify(options.schema)); // Deep copy
    }

    // Resolve all $ref references
    this._resolveAllRefs();

    // Extract base URL
    this._baseUrl = options.baseUrl || this._extractBaseUrl();

    this._defaultHeaders = options.headers ? { ...options.headers } : {};
    this._defaultQueryParams = options.queryParams ? { ...options.queryParams } : {};
    this._config = options.config;

    // Parse tools from schema
    this._parseTools();
  }

  /**
   * Get the parsed schema
   */
  get schema(): Record<string, unknown> {
    return this._schema;
  }

  /**
   * Get all parsed tools
   */
  get tools(): ToolInfo[] {
    return Array.from(this._tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): ToolInfo | undefined {
    return this._tools.get(name);
  }

  /**
   * Invoke a tool
   */
  invokeToolAsync = async (
    name: string,
    args: Record<string, unknown> = {},
    _config?: Config
  ): Promise<InvokeResult> => {
    const tool = this._tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found.`);
    }

    const method = (tool.method || 'get').toUpperCase();
    let path = tool.path || '/';

    // Build URL with path parameters
    const queryParams: Record<string, unknown> = {
      ...this._defaultQueryParams,
    };
    const headerParams: Record<string, string> = { ...this._defaultHeaders };
    let bodyContent: unknown = undefined;

    // Parse arguments into path, query, header, and body
    for (const [key, value] of Object.entries(args)) {
      if (key === 'body') {
        bodyContent = value;
      } else if (path.includes(`{${key}}`)) {
        path = path.replace(`{${key}}`, String(value));
      } else if (typeof value === 'string' && key.startsWith('X-')) {
        // Assume header parameter
        headerParams[key] = value;
      } else {
        // Default to query parameter
        queryParams[key] = value;
      }
    }

    // Build full URL
    const url = new URL(path, this._baseUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    // Make request
    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headerParams,
        },
      };

      if (bodyContent && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = JSON.stringify(bodyContent);
      }

      const response = await fetch(url.toString(), fetchOptions);

      // Clone response to avoid "Body already used" error
      const responseClone = response.clone();
      let responseBody: unknown;

      try {
        responseBody = await response.json();
      } catch {
        // If JSON parsing fails, try text
        responseBody = await responseClone.text();
      }

      return {
        status_code: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };
    } catch (error) {
      return {
        status_code: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  /**
   * Synchronous invoke (wrapper for async)
   */
  invokeToolSync(_name: string, _args: Record<string, unknown> = {}): InvokeResult {
    // Note: This is a simplified sync version that doesn't actually work in Node.js
    // It's mainly for testing purposes
    throw new Error(
      'Synchronous invocation is not supported in Node.js. Use invokeToolAsync instead.'
    );
  }

  // Alias for Python compatibility
  invoke_tool = (
    name: string,
    args: Record<string, unknown> = {},
    _config?: Config
  ): Promise<InvokeResult> => {
    return this.invokeToolAsync(name, args);
  };

  /**
   * Extract base URL from schema
   */
  private _extractBaseUrl(): string {
    const servers = this._schema.servers as Array<{ url: string }> | undefined;
    if (servers && servers.length > 0) {
      return servers[0].url;
    }
    return '';
  }

  /**
   * Resolve all $ref references in the schema
   */
  private _resolveAllRefs(): void {
    this._schema = this._resolveRefs(this._schema, this._schema) as Record<string, unknown>;
  }

  /**
   * Recursively resolve $ref references
   */
  private _resolveRefs(obj: unknown, root: Record<string, unknown>): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._resolveRefs(item, root));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      const objRecord = obj as Record<string, unknown>;

      // Check for $ref
      if ('$ref' in objRecord && typeof objRecord.$ref === 'string') {
        const refPath = objRecord.$ref;
        const resolved = this._resolveRef(refPath, root);

        // Recursively resolve the referenced object itself
        const resolvedDeep = this._resolveRefs(resolved, root);

        // Merge resolved reference with sibling properties
        if (typeof resolvedDeep === 'object' && resolvedDeep !== null) {
          Object.assign(result, resolvedDeep);
        }

        // Add other properties (sibling to $ref)
        for (const [key, value] of Object.entries(objRecord)) {
          if (key !== '$ref') {
            result[key] = this._resolveRefs(value, root);
          }
        }

        return result;
      }

      // Recursively resolve all properties
      for (const [key, value] of Object.entries(objRecord)) {
        result[key] = this._resolveRefs(value, root);
      }

      return result;
    }

    return obj;
  }

  /**
   * Resolve a single $ref path
   */
  private _resolveRef(refPath: string, root: Record<string, unknown>): unknown {
    if (!refPath.startsWith('#/')) {
      // External reference - not supported yet
      logger.warn(`External $ref not supported: ${refPath}`);
      return {};
    }

    const path = refPath.substring(2).split('/');
    let current: unknown = root;

    for (const part of path) {
      if (current === null || current === undefined) {
        return {};
      }
      if (typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return {};
      }
    }

    return current;
  }

  /**
   * Parse tools from OpenAPI paths
   */
  private _parseTools(): void {
    const paths = this._schema.paths as Record<string, Record<string, unknown>> | undefined;
    if (!paths) {
      return;
    }

    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) {
        continue;
      }

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
          continue;
        }

        if (typeof operation !== 'object' || operation === null) {
          continue;
        }

        const op = operation as Record<string, unknown>;
        const operationId = op.operationId as string | undefined;
        if (!operationId) {
          continue;
        }

        // Parse parameters
        const parameters = this._parseParameters(op, path);

        const tool: ToolInfo = {
          name: operationId,
          description: (op.summary as string) || (op.description as string),
          parameters,
          operationId,
          method,
          path,
        };

        this._tools.set(operationId, tool);
      }
    }
  }

  /**
   * Parse operation parameters into a schema
   */
  private _parseParameters(operation: Record<string, unknown>, _path: string): ToolParameterSchema {
    const result: ToolParameterSchema = {
      type: 'object',
      properties: {},
      required: [],
    };

    // Parse path/query/header parameters
    const params = operation.parameters as Array<Record<string, unknown>> | undefined;
    if (params && Array.isArray(params)) {
      for (const param of params) {
        const name = param.name as string;
        const schema = param.schema as ToolParameterSchema | undefined;
        const required = param.required as boolean;

        if (!name) continue;

        result.properties![name] = {
          type: schema?.type || 'string',
          description: (param.description as string) || undefined,
          ...schema,
        };

        if (required) {
          result.required!.push(name);
        }
      }
    }

    // Parse request body
    const requestBody = operation.requestBody as Record<string, unknown> | undefined;
    if (requestBody) {
      const content = requestBody.content as Record<string, Record<string, unknown>> | undefined;
      if (content) {
        const jsonContent = content['application/json'];
        if (jsonContent && jsonContent.schema) {
          result.properties!['body'] = jsonContent.schema as ToolParameterSchema;
          if (requestBody.required) {
            result.required!.push('body');
          }
        }
      }
    }

    return result;
  }
}

/**
 * ApiSet class for unified tool invocation
 * 统一的工具集接口，支持 OpenAPI 和 MCP 工具
 */
export class ApiSet {
  private _tools: Map<string, ToolInfo>;
  private _invoker: any; // Can be OpenAPI or MCP invoker
  private _baseUrl?: string;
  private _defaultHeaders: Record<string, string>;
  private _defaultQueryParams: Record<string, unknown>;
  private _baseConfig?: Config;

  constructor(
    tools: ToolInfo[],
    invoker: any,
    baseUrl?: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, unknown>,
    config?: Config
  ) {
    this._tools = new Map(tools.filter(t => t.name).map(t => [t.name, t]));
    this._invoker = invoker;
    this._baseUrl = baseUrl;
    this._defaultHeaders = headers ? { ...headers } : {};
    this._defaultQueryParams = queryParams ? { ...queryParams } : {};
    this._baseConfig = config;
  }

  /**
   * Invoke a tool by name
   * 调用指定的工具
   */
  invoke = async (
    name: string,
    args: Record<string, unknown> = {},
    config?: Config
  ): Promise<Record<string, unknown>> => {
    if (!this._tools.has(name)) {
      throw new Error(`Tool '${name}' not found.`);
    }

    // Convert arguments from non-serializable types
    const convertedArgs = this._convertArguments(args);

    // Merge configurations: prioritize passed config, otherwise use base_config
    const effectiveConfig = Config.withConfigs(this._baseConfig, config);

    // Call the actual invoker
    if (typeof this._invoker.invokeToolAsync === 'function') {
      return await this._invoker.invokeToolAsync(name, convertedArgs, effectiveConfig);
    } else if (typeof this._invoker.invoke_tool === 'function') {
      return await this._invoker.invoke_tool(name, convertedArgs, effectiveConfig);
    } else if (typeof this._invoker === 'function') {
      return await this._invoker(name, convertedArgs);
    } else {
      throw new Error('Invalid invoker provided.');
    }
  };

  /**
   * Get all tools
   * 返回所有工具列表
   */
  get tools(): ToolInfo[] {
    return Array.from(this._tools.values());
  }

  /**
   * Get a specific tool
   * 获取指定名称的工具
   */
  getTool(name: string): ToolInfo | undefined {
    return this._tools.get(name);
  }

  /**
   * Convert arguments from framework-specific types to native JavaScript types
   * 将常见框架类型转换为 JavaScript 原生类型
   *
   * Purpose: Ensure we send JSON-serializable data to OpenAPI
   * 目的：确保我们发送到 OpenAPI 的 JSON body 是可以被序列化的
   */
  private _convertToNative(value: unknown): unknown {
    // Basic types
    if (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.map(item => this._convertToNative(item));
    }

    // Plain objects
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      // Handle objects with toJSON method
      if (typeof obj.toJSON === 'function') {
        try {
          return this._convertToNative(obj.toJSON());
        } catch {
          // Ignore and continue
        }
      }

      // Handle plain objects
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = this._convertToNative(v);
      }
      return result;
    }

    // Cannot convert, return original value
    return value;
  }

  /**
   * Convert arguments dictionary
   * 转换参数字典
   */
  private _convertArguments(args?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!args || typeof args !== 'object') {
      return args;
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      result[k] = this._convertToNative(v);
    }
    return result;
  }

  /**
   * Create ApiSet from MCP tools
   * 从 MCP tools 创建 ApiSet
   *
   * @param tools - MCP tools list or single tool / MCP tools 列表或单个工具
   * @param mcpClient - MCP client (MCPToolSet instance) / MCP 客户端（MCPToolSet 实例）
   * @param config - Configuration object / 配置对象
   */
  static fromMCPTools(params: { tools: unknown; mcpClient: any; config?: Config }): ApiSet {
    const { tools, mcpClient, config } = params;

    // Get tools list / 获取工具列表
    const toolInfos: ToolInfo[] = [];
    let toolArray: unknown[];

    // If tools is a single tool, convert to array
    // 如果 tools 是单个工具，转换为列表
    if (Array.isArray(tools)) {
      toolArray = tools;
    } else if (tools) {
      toolArray = [tools];
    } else {
      toolArray = [];
    }

    for (const tool of toolArray) {
      if (!tool) {
        continue;
      }

      try {
        // Use ToolInfo.fromMCPTool to parse the tool
        // 使用 ToolInfo.fromMCPTool 解析工具
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ToolInfo } = require('./model');
        const toolInfo = ToolInfo.fromMCPTool(tool);
        toolInfos.push(toolInfo);
      } catch (error) {
        logger.warn(`Failed to parse MCP tool:`, error);
        continue;
      }
    }

    // Create invoker wrapper / 创建调用器包装
    class MCPInvoker {
      constructor(
        private mcpClient: any,
        private config?: Config
      ) {}

      invokeToolAsync = async (
        name: string,
        args?: Record<string, unknown>,
        config?: Config
      ): Promise<Record<string, unknown>> => {
        const cfg = Config.withConfigs(this.config, config);
        return await this.mcpClient.callToolAsync(name, args, cfg);
      };
    }

    const invoker = new MCPInvoker(mcpClient, config);

    return new ApiSet(toolInfos, invoker, undefined, undefined, undefined, config);
  }
}
