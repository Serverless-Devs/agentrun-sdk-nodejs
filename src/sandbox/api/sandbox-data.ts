/**
 * Sandbox Data API Base Class
 *
 * This module provides an HTTP client for interacting with the AgentRun Sandbox Data API.
 * 此模块提供用于与 AgentRun Sandbox Data API 交互的 HTTP 客户端。
 */

import * as $AgentRun from "@alicloud/agentrun20250910";
import * as $Util from "@alicloud/tea-util";

import { Config } from "../../utils/config";
import { ControlAPI } from "../../utils/control-api";
import { ClientError } from "../../utils/exception";
import { logger } from "../../utils/log";

/**
 * Resource type enum
 */
export enum ResourceType {
  Runtime = "runtime",
  LiteLLM = "litellm",
  Tool = "tool",
  Template = "template",
  Sandbox = "sandbox",
}

/**
 * Sandbox Data API Client
 *
 * Provides methods for making HTTP requests to sandbox data API endpoints.
 */
export class SandboxDataAPI {
  protected resourceName: string;
  protected resourceType: ResourceType;
  protected namespace: string;
  protected config: Config;
  protected accessToken?: string;
  protected accessTokenMap: Map<string, string> = new Map();

  constructor(params: {
    sandboxId?: string;
    templateName?: string;
    config?: Config;
    namespace?: string;
  }) {
    const { config, namespace = "sandboxes" } = params;

    this.resourceName = "";
    this.resourceType = ResourceType.Template;
    this.namespace = namespace;
    this.config = config || new Config();

    // Note: Cannot call async refreshAccessToken in constructor
    // Token will be refreshed on first API call
  }

  /**
   * Refresh access token for the resource
   */
  protected async refreshAccessToken(params: {
    sandboxId?: string;
    templateName?: string;
    config?: Config;
  }): Promise<void> {
    const { sandboxId, templateName, config } = params;
    const cfg = Config.withConfigs(config, this.config);

    const cacheKey = (sandboxId || templateName)!;
    const cachedToken = this.accessTokenMap.get(cacheKey);

    if (sandboxId) {
      this.resourceName = sandboxId;
      this.resourceType = ResourceType.Sandbox;
      this.namespace = `sandboxes/${sandboxId}`;
    } else if (templateName) {
      this.resourceName = templateName;
      this.resourceType = ResourceType.Template;
      this.namespace = "sandboxes";
    }

    if (cachedToken) {
      this.accessToken = cachedToken;
      return;
    }

    // Fetch new token if not cached
    this.accessToken = undefined;
    await this.auth({ config: cfg });
    if (this.accessToken) {
      this.accessTokenMap.set(cacheKey, this.accessToken);
    }
  }

  /**
   * Get base URL for data API
   */
  protected getBaseUrl(): string {
    return this.config.dataEndpoint;
  }

  /**
   * Construct full URL with path and query parameters
   */
  protected withPath(
    path: string,
    query?: Record<string, any>,
  ): string {
    // Remove leading slash
    path = path.replace(/^\//, "");

    // Build base URL
    const parts = [this.getBaseUrl(), this.namespace, path].filter(
      (p) => p && p.length > 0,
    );
    let url = parts.join("/").replace(/\/+/g, "/").replace(/:\//g, "://");

    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const urlObj = new URL(url);
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => urlObj.searchParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });
      url = urlObj.toString();
    }

    return url;
  }

  /**
   * Authentication hook - gets access token for the resource
   */
  protected async auth(params: { config?: Config }): Promise<void> {
    const cfg = Config.withConfigs(this.config, params.config);

    // If token is provided in config, use it directly
    if (cfg.token) {
      logger.debug(
        `Using provided access token from config: ${this.maskToken(cfg.token)}`,
      );
      this.accessToken = cfg.token;
      return;
    }

    // Fetch access token from control API if needed
    if (
      !this.accessToken &&
      this.resourceName &&
      this.resourceType &&
      !cfg.token
    ) {
      try {
        const controlApi = new ControlAPI(cfg);
        const client = (controlApi as any).getClient(cfg);

        const request =
          this.resourceType === ResourceType.Sandbox
            ? new $AgentRun.GetAccessTokenRequest({
                resourceId: this.resourceName,
                resourceType: this.resourceType,
              })
            : new $AgentRun.GetAccessTokenRequest({
                resourceName: this.resourceName,
                resourceType: this.resourceType,
              });

        const runtime = new $Util.RuntimeOptions({});
        const response = await client.getAccessTokenWithOptions(request, {}, runtime);

        this.accessToken = response.body?.data?.accessToken;

        logger.debug(
          `Fetched access token for resource ${this.resourceName} of type ${this.resourceType}: ${this.maskToken(this.accessToken || "")}`,
        );
      } catch (error) {
        logger.warn(
          `Failed to get access token for ${this.resourceType}(${this.resourceName}): ${error}`,
        );
      }
    }
  }

  /**
   * Mask token for logging
   */
  protected maskToken(token: string): string {
    if (!token || token.length <= 8) {
      return "***";
    }
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Prepare request headers
   */
  protected prepareHeaders(params: {
    headers?: Record<string, string>;
    config?: Config;
  }): Record<string, string> {
    const cfg = Config.withConfigs(this.config, params.config);

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AgentRunDataClient-Node/1.0",
      "Agentrun-Access-Token": cfg.token || this.accessToken || "",
      ...cfg.headers,
      ...(params.headers || {}),
    };

    return reqHeaders;
  }

  /**
   * Make an HTTP request
   */
  protected async makeRequest<T = any>(params: {
    method: string;
    url: string;
    data?: any;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    config?: Config;
  }): Promise<T> {
    const { method, url, data, headers, query, config } = params;

    // Prepare headers
    const reqHeaders = this.prepareHeaders({ headers, config });

    // Add query parameters to URL
    let finalUrl = url;
    if (query && Object.keys(query).length > 0) {
      const urlObj = new URL(url);
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => urlObj.searchParams.append(key, String(v)));
          } else {
            urlObj.searchParams.append(key, String(value));
          }
        }
      });
      finalUrl = urlObj.toString();
    }

    logger.debug(
      `${method} ${finalUrl} headers=${JSON.stringify(reqHeaders)} data=${JSON.stringify(data)}`,
    );

    try {
      const cfg = Config.withConfigs(this.config, config);
      const response = await fetch(finalUrl, {
        method,
        headers: reqHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(cfg.timeout),
      });

      const responseText = await response.text();
      logger.debug(`Response: ${responseText}`);

      // Parse JSON response
      if (responseText) {
        try {
          return JSON.parse(responseText) as T;
        } catch (error) {
          const errorMsg = `Failed to parse JSON response: ${error}`;
          logger.error(errorMsg);

          if (response.status === 502 && responseText.includes("502 Bad Gateway")) {
            throw new ClientError(response.status, "502 Bad Gateway");
          }

          throw new ClientError(response.status, errorMsg);
        }
      }

      return {} as T;
    } catch (error) {
      if (error instanceof ClientError) {
        throw error;
      }

      const errorMsg = `Request error: ${error}`;
      throw new ClientError(0, errorMsg);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(params: {
    path: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<T> {
    const url = this.withPath(params.path, params.query);
    return this.makeRequest<T>({
      method: "GET",
      url,
      headers: params.headers,
      config: params.config,
    });
  }

  /**
   * POST request
   */
  async post<T = any>(params: {
    path: string;
    data?: any;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<T> {
    const url = this.withPath(params.path, params.query);
    return this.makeRequest<T>({
      method: "POST",
      url,
      data: params.data,
      headers: params.headers,
      config: params.config,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(params: {
    path: string;
    data?: any;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<T> {
    const url = this.withPath(params.path, params.query);
    return this.makeRequest<T>({
      method: "PUT",
      url,
      data: params.data,
      headers: params.headers,
      config: params.config,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(params: {
    path: string;
    data?: any;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<T> {
    const url = this.withPath(params.path, params.query);
    return this.makeRequest<T>({
      method: "PATCH",
      url,
      data: params.data,
      headers: params.headers,
      config: params.config,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(params: {
    path: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<T> {
    const url = this.withPath(params.path, params.query);
    return this.makeRequest<T>({
      method: "DELETE",
      url,
      headers: params.headers,
      config: params.config,
    });
  }

  /**
   * Check sandbox health
   */
  checkHealth = async (params: { 
    sandboxId: string;
    config?: Config 
  }): Promise<{ status: string; [key: string]: any }> => {
    await this.refreshAccessToken({
      sandboxId: params.sandboxId,
      config: params.config,
    });
    
    return this.get({ path: "/health", config: params.config });
  };

  /**
   * Create sandbox from template
   * 从模板创建沙箱 / Create Sandbox from Template
   */
  createSandbox = async (params: {
    templateName: string;
    sandboxIdleTimeoutInSeconds?: number;
    nasConfig?: Record<string, any>;
    ossMountConfig?: Record<string, any>;
    polarFsConfig?: Record<string, any>;
    config?: Config;
  }): Promise<any> => {
    await this.refreshAccessToken({
      templateName: params.templateName,
      config: params.config,
    });

    // Build request data / 构建请求数据
    const data: Record<string, any> = {
      templateName: params.templateName,
      sandboxIdleTimeoutInSeconds: params.sandboxIdleTimeoutInSeconds || 600,
    };

    // Add optional parameters / 添加可选参数
    if (params.nasConfig !== undefined) {
      data.nasConfig = params.nasConfig;
    }
    if (params.ossMountConfig !== undefined) {
      data.ossMountConfig = params.ossMountConfig;
    }
    if (params.polarFsConfig !== undefined) {
      data.polarFsConfig = params.polarFsConfig;
    }

    return this.post({
      path: "/",
      data,
    });
  };

  /**
   * Delete sandbox
   */
  deleteSandbox = async (params: {
    sandboxId: string;
    config?: Config;
  }): Promise<any> => {
    await this.refreshAccessToken({
      sandboxId: params.sandboxId,
      config: params.config,
    });

    return this.delete({ path: "/" });
  };

  /**
   * Stop sandbox
   */
  stopSandbox = async (params: {
    sandboxId: string;
    config?: Config;
  }): Promise<any> => {
    await this.refreshAccessToken({
      sandboxId: params.sandboxId,
      config: params.config,
    });

    return this.post({ path: "/stop" });
  };

  /**
   * Get sandbox info
   */
  getSandbox = async (params: {
    sandboxId: string;
    config?: Config;
  }): Promise<any> => {
    await this.refreshAccessToken({
      sandboxId: params.sandboxId,
      config: params.config,
    });

    return this.get({ path: "/" });
  };
}
