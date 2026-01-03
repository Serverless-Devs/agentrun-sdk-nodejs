/**
 * ToolSet Resource Class
 *
 * ToolSet 资源类，用于管理 ToolSet 资源。
 * Resource class for managing ToolSet resources.
 */

import * as $Devs from "@alicloud/devs20230714";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";

import { Config } from "../utils/config";

// Handle ESM/CJS interop for Client class
const $DevsClient =
  // @ts-expect-error - ESM interop: default.default exists when imported as ESM namespace
  $Devs.default?.default ?? $Devs.default ?? $Devs;
import { ClientError, HTTPError, ServerError } from "../utils/exception";
import { logger } from "../utils/log";
import { Status } from "../utils/model";
import { updateObjectProperties } from "../utils/resource";

import {
  ToolSetCreateInput,
  ToolSetData,
  ToolSetListInput,
  ToolSetSpec,
  ToolSetStatus,
  ToolSetUpdateInput,
} from "./model";

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

  constructor(data?: Partial<ToolSetData>, config?: Config) {
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Get ToolSet name (alias for name)
   */
  get toolSetName(): string | undefined {
    return this.name;
  }

  /**
   * Get ToolSet ID (alias for uid)
   */
  get toolSetId(): string | undefined {
    return this.uid;
  }

  /**
   * Check if the toolset is ready
   */
  get isReady(): boolean {
    return this.status?.status === Status.READY;
  }

  /**
   * Create toolset from SDK response object
   */
  static fromInnerObject(obj: $Devs.Toolset, config?: Config): ToolSet {
    if (!obj) {
      throw new Error('Invalid toolset object: object is null or undefined');
    }
    
    return new ToolSet(
      {
        name: obj.name,
        uid: obj.uid,
        kind: obj.kind,
        description: obj.description,
        createdTime: obj.createdTime,
        generation: obj.generation,
        labels: obj.labels as Record<string, string>,
        spec: {
          schema: {
            type: obj.spec?.schema?.type as any,
            detail: obj.spec?.schema?.detail,
          },
          authConfig: {
            type: obj.spec?.authConfig?.type,
            apiKeyHeaderName:
              obj.spec?.authConfig?.parameters?.apiKeyParameter?.key,
            apiKeyValue:
              obj.spec?.authConfig?.parameters?.apiKeyParameter?.value,
          },
        },
        status: {
          status: obj.status?.status as Status,
          statusReason: obj.status?.statusReason,
          outputs: {
            mcpServerConfig: {
              url: obj.status?.outputs?.mcpServerConfig?.url,
              transport: obj.status?.outputs?.mcpServerConfig?.transport,
            },
            tools: obj.status?.outputs?.tools?.map((tool) => ({
              name: tool.name,
              description: tool.description,
            })),
            urls: {
              cdpUrl: obj.status?.outputs?.urls?.cdpUrl,
              liveViewUrl: obj.status?.outputs?.urls?.liveViewUrl,
              streamUrl: obj.status?.outputs?.urls?.streamUrl,
            },
          },
        },
      },
      config,
    );
  }

  /**
   * Get DevS client
   */
  private static getClient(config?: Config): InstanceType<typeof $DevsClient> {
    const cfg = Config.withConfigs(config);

    // Use devs endpoint
    let endpoint = cfg.devsEndpoint;

    // Remove protocol prefix for SDK
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      endpoint = endpoint.split("://")[1];
    }

    const openApiConfig = new $OpenApi.Config({
      accessKeyId: cfg.accessKeyId,
      accessKeySecret: cfg.accessKeySecret,
      securityToken: cfg.securityToken || undefined,
      regionId: cfg.regionId,
      endpoint: endpoint,
      connectTimeout: cfg.timeout,
    });

    return new $DevsClient(openApiConfig);
  }

  /**
   * Create a new ToolSet
   */
  static async create(params: {
    input: ToolSetCreateInput;
    config?: Config;
  }): Promise<ToolSet> {
    const { input, config } = params;
    try {
      const client = ToolSet.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      // Build authorization parameters if provided
      let authConfig: $Devs.Authorization | undefined;
      if (input.spec?.authConfig) {
        authConfig = new $Devs.Authorization({
          type: input.spec.authConfig.type,
          parameters: new $Devs.AuthorizationParameters({
            apiKeyParameter: new $Devs.APIKeyAuthParameter({
              key: input.spec.authConfig.apiKeyHeaderName,
              value: input.spec.authConfig.apiKeyValue,
              in: "header",
            }),
          }),
        });
      }

      const request = new $Devs.CreateToolsetRequest({
        body: new $Devs.Toolset({
          name: input.name,
          description: input.description,
          labels: input.labels,
          spec: input.spec
            ? new $Devs.ToolsetSpec({
                schema: input.spec.schema
                  ? new $Devs.ToolsetSchema({
                      type: input.spec.schema.type,
                      detail: input.spec.schema.detail,
                    })
                  : undefined,
                authConfig: authConfig,
              })
            : undefined,
        }),
      });

      const response = await client.createToolsetWithOptions(
        request,
        {},
        runtime,
      );

      logger.debug(
        `API createToolset called, Request ID: ${response.body?.requestId}`,
      );

      return ToolSet.fromInnerObject(
        response.body as $Devs.Toolset,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("ToolSet", input.name);
      }
      ToolSet.handleError(error);
    }
  }

  /**
   * Delete a ToolSet by Name
   */
  static async delete(params: {
    name: string;
    config?: Config;
  }): Promise<ToolSet> {
    const { name, config } = params;
    try {
      const client = ToolSet.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      const response = await client.deleteToolsetWithOptions(name, {}, runtime);

      logger.debug(
        `API deleteToolset called, Request ID: ${response.body?.requestId}`,
      );

      return ToolSet.fromInnerObject(
        response.body as $Devs.Toolset,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("ToolSet", name);
      }
      ToolSet.handleError(error);
    }
  }

  /**
   * Get a ToolSet by Name
   */
  static async get(params: {
    name: string;
    config?: Config;
  }): Promise<ToolSet> {
    const { name, config } = params;
    try {
      const client = ToolSet.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      logger.debug(`Calling getToolset API for: ${name}`);
      
      const response = await client.getToolsetWithOptions(name, {}, runtime);

      logger.debug(
        `API getToolset response, Request ID: ${response.body?.requestId}`
      );

      if (!response.body) {
        throw new Error(`API returned empty response body for toolset: ${name}`);
      }

      // The SDK returns the toolset data directly in body, not in body.data
      return ToolSet.fromInnerObject(
        response.body as $Devs.Toolset,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("ToolSet", name);
      }
      ToolSet.handleError(error);
    }
  }

  /**
   * List ToolSets
   */
  static async list(
    input?: ToolSetListInput,
    config?: Config,
  ): Promise<ToolSet[]> {
    try {
      const client = ToolSet.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      // Convert labels to labelSelector format if needed
      let labelSelector: string[] | undefined;
      if (input?.labels) {
        labelSelector = Object.entries(input.labels).map(
          ([k, v]) => `${k}=${v}`,
        );
      }

      const request = new $Devs.ListToolsetsRequest({
        keyword: input?.prefix,
        pageNumber: input?.pageSize ? 1 : undefined,
        pageSize: input?.pageSize,
        labelSelector: labelSelector,
      });

      const response = await client.listToolsetsWithOptions(
        request,
        {},
        runtime,
      );

      logger.debug(
        `API listToolsets called, Request ID: ${response.body?.requestId}`,
      );

      // Response body has data as Toolset[]
      // SDK returns array of toolsets directly in items field
      const items = (response.body as any)?.items || [];
      return items.map((item: $Devs.Toolset) =>
        ToolSet.fromInnerObject(item, config),
      );
    } catch (error) {
      ToolSet.handleError(error);
    }
  }

  /**
   * List all ToolSets with pagination
   */
  static async listAll(
    options?: { prefix?: string; labels?: Record<string, string> },
    config?: Config,
  ): Promise<ToolSet[]> {
    const toolsets: ToolSet[] = [];
    const pageSize = 50;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await ToolSet.list(
        {
          prefix: options?.prefix,
          labels: options?.labels,
          pageSize,
        },
        config,
      );

      toolsets.push(...result);

      if (result.length < pageSize) {
        break;
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return toolsets.filter((t) => {
      if (!t.uid || seen.has(t.uid)) {
        return false;
      }
      seen.add(t.uid);
      return true;
    });
  }

  /**
   * Update a ToolSet by Name
   */
  static async update(params: {
    name: string;
    input: ToolSetUpdateInput;
    config?: Config;
  }): Promise<ToolSet> {
    const { name, input, config } = params;
    try {
      const client = ToolSet.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      // Build authorization parameters if provided
      let authConfig: $Devs.Authorization | undefined;
      if (input.spec?.authConfig) {
        authConfig = new $Devs.Authorization({
          type: input.spec.authConfig.type,
          parameters: new $Devs.AuthorizationParameters({
            apiKeyParameter: new $Devs.APIKeyAuthParameter({
              key: input.spec.authConfig.apiKeyHeaderName,
              value: input.spec.authConfig.apiKeyValue,
              in: "header",
            }),
          }),
        });
      }

      const request = new $Devs.UpdateToolsetRequest({
        body: new $Devs.Toolset({
          description: input.description,
          labels: input.labels,
          spec: input.spec
            ? new $Devs.ToolsetSpec({
                schema: input.spec.schema
                  ? new $Devs.ToolsetSchema({
                      type: input.spec.schema.type,
                      detail: input.spec.schema.detail,
                    })
                  : undefined,
                authConfig: authConfig,
              })
            : undefined,
        }),
      });

      const response = await client.updateToolsetWithOptions(
        name,
        request,
        {},
        runtime,
      );

      logger.debug(
        `API updateToolset called, Request ID: ${response.body?.requestId}`,
      );

      return ToolSet.fromInnerObject(
        response.body as $Devs.Toolset,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("ToolSet", name);
      }
      ToolSet.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private static handleError(error: unknown): never {
    if (error && typeof error === "object" && "statusCode" in error) {
      const e = error as {
        statusCode: number;
        message: string;
        data?: { requestId?: string };
      };
      const statusCode = e.statusCode;
      const message = e.message || "Unknown error";
      const requestId = e.data?.requestId;

      if (statusCode >= 400 && statusCode < 500) {
        throw new ClientError(statusCode, message, { requestId });
      } else if (statusCode >= 500) {
        throw new ServerError(statusCode, message, { requestId });
      }
    }
    throw error;
  }

  /**
   * Delete this toolset
   */
  delete = async (params?: { config?: Config }): Promise<ToolSet> => {
    const config = params?.config;
    if (!this.name) {
      throw new Error("name is required to delete a ToolSet");
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
  update = async (params: {
    input: ToolSetUpdateInput;
    config?: Config;
  }): Promise<ToolSet> => {
    const { input, config } = params;
    if (!this.name) {
      throw new Error("name is required to update a ToolSet");
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
      throw new Error("name is required to refresh a ToolSet");
    }

    const result = await ToolSet.get({
      name: this.name,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Wait until the toolset is ready
   */
  waitUntilReady = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (toolset: ToolSet) => void;
    },
    config?: Config,
  ): Promise<ToolSet> => {
    const timeout = (options?.timeoutSeconds ?? 300) * 1000;
    const interval = (options?.intervalSeconds ?? 5) * 1000;
    const startTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this.refresh({ config });

      if (options?.beforeCheck) {
        options.beforeCheck(this);
      }

      if (this.status?.status === Status.READY) {
        return this;
      }

      if (this.status?.status === Status.CREATE_FAILED) {
        throw new Error(`ToolSet failed: ${this.status?.statusReason}`);
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout waiting for ToolSet to be ready after ${timeout / 1000}s`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
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
    const { ToolSetSchemaType } = require("./model");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolInfo } = require("./model");

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
    const { ToolSetSchemaType } = require("./model");

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
  callTool = (
    name: string,
    args?: Record<string, unknown>,
    config?: Config
  ): Promise<any> => {
    return this.callToolAsync(name, args, config);
  };

  /**
   * Convert ToolSet to unified ApiSet object
   * 将 ToolSet 转换为统一的 ApiSet 对象
   */
  toApiSet = async (params?: { config?: Config }): Promise<any> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ApiSet } = require("./openapi");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ToolSetSchemaType } = require("./model");

    if (this.type() === ToolSetSchemaType.MCP) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MCPToolSet } = require("./api/mcp");

      const mcpServerConfig = (this.status?.outputs as any)?.mcpServerConfig;
      if (!mcpServerConfig?.url) {
        throw new Error("MCP server URL is missing.");
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
      const { OpenAPI } = require("./openapi");
      
      const openapi = new OpenAPI({
        schema: this.spec?.schema?.detail || "{}",
        baseUrl: this._getOpenAPIBaseUrl(),
        headers,
        queryParams: query,
        config: params?.config,
      });

      // Convert OpenAPI tools to ToolInfo format
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ToolInfo } = require("./model");
      const tools = openapi.tools.map((t: any) => 
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

    if (authType === "APIKey") {
      const key = authConfig?.apiKeyHeaderName;
      const value = authConfig?.apiKeyValue;
      const location = "header"; // Default location

      if (key && value) {
        if (location === "header") {
          headers[key] = value;
        } else if (location === "query") {
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
    return outputs?.urls?.intranetUrl || outputs?.urls?.internetUrl;
  }
}
