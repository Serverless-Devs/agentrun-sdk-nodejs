/**
 * ToolSet Resource Class
 *
 * ToolSet 资源类，用于管理 ToolSet 资源。
 * Resource class for managing ToolSet resources.
 */

import { Config } from '../utils/config';
import { logger } from '../utils/log';
import { listAllResourcesFunction, updateObjectProperties } from '../utils/resource';

import {
  ToolSetCreateInput,
  ToolSetData,
  ToolSetListInput,
  ToolSetSpec,
  ToolSetStatus,
  ToolSetUpdateInput,
} from './model';

/**
 * ToolSet resource class
 */
export class ToolSet implements ToolSetData {
  name?: string;
  uid?: string;
  kind?: string;
  description?: string;
  createdTime?: string;
  generation?: number;
  labels?: Record<string, string>;
  spec?: ToolSetSpec;
  status?: ToolSetStatus;

  private _config?: Config;

  constructor(data?: any, config?: Config) {
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Get DevS client
   */
  private static getClient() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolSetClient } = require('./client');
    return new ToolSetClient();
  }

  uniqIdCallback = () => this.name;

  /**
   * Create a new ToolSet
   */
  static async create(params: { input: ToolSetCreateInput; config?: Config }): Promise<ToolSet> {
    const { input, config } = params;
    return await ToolSet.getClient().create({ input, config });
  }

  /**
   * Delete a ToolSet by Name
   */
  static async delete(params: { name: string; config?: Config }): Promise<ToolSet> {
    const { name, config } = params;
    return await ToolSet.getClient().delete({ name, config });
  }

  /**
   * Get a ToolSet by Name
   */
  static async get(params: { name: string; config?: Config }): Promise<ToolSet> {
    const { name, config } = params;
    return await ToolSet.getClient().get({ name, config });
  }

  /**
   * List ToolSets
   */

  static list: /**
     * @deprecated
     */
    | ((input?: ToolSetListInput, config?: Config) => Promise<ToolSet[]>)
    /**
     * 枚举 ToolSet 列表 / List ToolSet list
     */
    | ((params?: { input?: ToolSetListInput; config?: Config }) => Promise<ToolSet[]>) = async (
    ...args: any
  ): Promise<ToolSet[]> => {
    let input: ToolSetListInput | undefined;
    let config: Config | undefined;

    if (args.length >= 1 && 'input' in args[0]) {
      input = args[0].input;
    } else {
      input = args[0];
    }

    if (args.length >= 1 && 'config' in args[0]) {
      config = args[0].config;
    } else if (args.length > 1 && args[1] instanceof Config) {
      config = args[1];
    }

    return await this.getClient().list({
      input: {
        ...input,
      } as ToolSetListInput,
      config,
    });
  };

  static listAll: /**
     * @deprecated
     */
    | ((
        options?: { prefix?: string; labels?: Record<string, string> },
        config?: Config
      ) => Promise<ToolSet[]>)
    /**
     * 枚举 ToolSet 列表 / List ToolSet list
     */
    | ((params?: { input?: ToolSetListInput; config?: Config }) => Promise<ToolSet[]>) = async (
    ...args: any
  ) => {
    let input: ToolSetListInput | undefined;
    let config: Config | undefined;

    if (args.length >= 1 && 'input' in args[0]) {
      input = args[0].input;
    } else {
      input = args[0];
    }

    if (args.length >= 1 && 'config' in args[0]) {
      config = args[0].config;
    } else if (args.length > 1 && args[1] instanceof Config) {
      config = args[1];
    }

    return await listAllResourcesFunction(this.list as any)({ ...input, config });
  };

  /**
   * Update a ToolSet by Name
   */
  static async update(params: {
    name: string;
    input: ToolSetUpdateInput;
    config?: Config;
  }): Promise<ToolSet> {
    const { name, input, config } = params;
    return await ToolSet.getClient().update({ name, input, config });
  }

  /**
   * Delete this toolset
   */
  delete = async (params?: { config?: Config }): Promise<ToolSet> => {
    const config = params?.config;
    if (!this.name) {
      throw new Error('name is required to delete a ToolSet');
    }

    const result = await ToolSet.delete({
      name: this.name,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Update this toolset
   */
  update = async (params: { input: ToolSetUpdateInput; config?: Config }): Promise<ToolSet> => {
    const { input, config } = params;
    if (!this.name) {
      throw new Error('name is required to update a ToolSet');
    }

    const result = await ToolSet.update({
      name: this.name,
      input,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this toolset's data
   */
  refresh = async (params?: { config?: Config }): Promise<ToolSet> => {
    const config = params?.config;
    if (!this.name) {
      throw new Error('name is required to refresh a ToolSet');
    }

    const result = await ToolSet.get({
      name: this.name,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Get toolset type
   * 获取工具集类型
   */
  type(): string | undefined {
    return this.spec?.schema?.type;
  }

  /**
   * List tools (async)
   * 异步获取工具列表，返回统一的 ToolInfo 列表
   */
  listToolsAsync = async (params?: { config?: Config }): Promise<any[]> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolSetSchemaType } = require('./model');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolInfo } = require('./model');

    if (this.type() === ToolSetSchemaType.MCP) {
      // MCP tools
      const mcpTools = this.status?.outputs?.tools || [];
      return mcpTools.map((tool: any) => ToolInfo.fromMCPTool(tool));
    } else if (this.type() === ToolSetSchemaType.OPENAPI) {
      // OpenAPI tools - use toApiSet
      const apiset = await this.toApiSet(params);
      return apiset.tools;
    }
    return [];
  };

  /**
   * List tools (sync wrapper)
   * 同步获取工具列表，返回统一的 ToolInfo 列表
   */
  listTools = (config?: Config): Promise<any[]> => {
    return this.listToolsAsync({ config });
  };

  /**
   * Call tool (async)
   * 异步调用工具，统一使用 ApiSet 实现
   */
  callToolAsync = async (
    name: string,
    args?: Record<string, unknown>,
    config?: Config
  ): Promise<any> => {
    const apiset = await this.toApiSet({ config });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolSetSchemaType } = require('./model');

    // For OpenAPI, may need to resolve operation name
    // 对于 OpenAPI，可能需要解析 operation name
    if (this.type() === ToolSetSchemaType.OPENAPI) {
      const tool = apiset.getTool(name);
      if (!tool) {
        // Try to find via tool_id mapping
        // 尝试通过 tool_id 映射查找
        const openApiTools = (this.status?.outputs as any)?.openApiTools || [];
        for (const toolMeta of openApiTools) {
          if (!toolMeta) continue;
          if (toolMeta.toolId === name || toolMeta.tool_id === name) {
            name = toolMeta.toolName || toolMeta.tool_name || name;
            break;
          }
        }
      }
    }

    logger.debug(`Invoke tool ${name} with arguments`, args);
    const result = await apiset.invoke(name, args, config);
    logger.debug(`Invoke tool ${name} got result`, result);
    return result;
  };

  /**
   * Call tool (sync wrapper)
   * 同步调用工具，统一使用 ApiSet 实现
   */
  callTool = (name: string, args?: Record<string, unknown>, config?: Config): Promise<any> => {
    return this.callToolAsync(name, args, config);
  };

  /**
   * Convert ToolSet to unified ApiSet object
   * 将 ToolSet 转换为统一的 ApiSet 对象
   */
  toApiSet = async (params?: { config?: Config }): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ApiSet } = require('./openapi');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolSetSchemaType } = require('./model');

    if (this.type() === ToolSetSchemaType.MCP) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MCPToolSet } = require('./api/mcp');

      const mcpServerConfig = (this.status?.outputs as any)?.mcpServerConfig;
      if (!mcpServerConfig?.url) {
        throw new Error('MCP server URL is missing.');
      }

      const cfg = Config.withConfigs(
        params?.config,
        new Config({ headers: mcpServerConfig.headers })
      );

      const mcpClient = new MCPToolSet(mcpServerConfig.url, cfg);

      // Get MCP tools
      const mcpTools = this.status?.outputs?.tools || [];

      return ApiSet.fromMCPTools({
        tools: mcpTools,
        mcpClient,
        config: cfg,
      });
    } else if (this.type() === ToolSetSchemaType.OPENAPI) {
      const headers = this._getOpenAPIAuthDefaults().headers;
      const query = this._getOpenAPIAuthDefaults().query;

      // Use OpenAPI.fromSchema if available, otherwise create basic ApiSet
      // 如果可用，使用 OpenAPI.fromSchema，否则创建基本 ApiSet
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OpenAPI } = require('./openapi');

      const openapi = new OpenAPI({
        schema: this.spec?.schema?.detail || '{}',
        baseUrl: this._getOpenAPIBaseUrl(),
        headers,
        queryParams: query,
        config: params?.config,
      });

      // Convert OpenAPI tools to ToolInfo format
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ToolInfo } = require('./model');
      const tools = openapi.tools.map(
        (t: any) =>
          new ToolInfo({
            name: t.name,
            description: t.description,
            parameters: t.parameters as any,
          })
      );

      return new ApiSet(tools, openapi, undefined, headers, query, params?.config);
    }

    throw new Error(`Unsupported ToolSet type: ${this.type()}`);
  };

  /**
   * Get OpenAPI authentication defaults
   * 获取 OpenAPI 认证默认值
   */
  private _getOpenAPIAuthDefaults(): {
    headers: Record<string, string>;
    query: Record<string, string>;
  } {
    const headers: Record<string, string> = {};
    const query: Record<string, string> = {};

    const authConfig = this.spec?.authConfig;
    const authType = authConfig?.type;

    if (authType === 'APIKey') {
      const key = authConfig?.apiKeyHeaderName;
      const value = authConfig?.apiKeyValue;
      const location = 'header'; // Default location

      if (key && value) {
        if (location === 'header') {
          headers[key] = value;
        } else if (location === 'query') {
          query[key] = value;
        }
      }
    }

    return { headers, query };
  }

  /**
   * Get OpenAPI base URL
   * 获取 OpenAPI 基础 URL
   */
  private _getOpenAPIBaseUrl(): string | undefined {
    const outputs = this.status?.outputs as any;
    return outputs?.urls?.internetUrl || outputs?.urls?.intranetUrl;
  }
}
