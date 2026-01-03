/**
 * Control API Base Module
 *
 * 此模块定义控制链路 API 的基类。
 * This module defines the base class for control API.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";
import * as $OpenApi from "@alicloud/openapi-client";

import { Config } from "./config";

// Handle ESM/CJS interop for Client class
const $AgentRunClient =
  // @ts-expect-error - ESM interop: default.default exists when imported as ESM namespace
  $AgentRun.default?.default ?? $AgentRun.default ?? $AgentRun;

type Client = InstanceType<typeof $AgentRunClient>;

/**
 * Base class for Control API clients
 *
 * 提供控制链路和 DevS API 客户端的获取功能。
 * Provides functionality to get control API and DevS API clients.
 */
export class ControlAPI {
  protected config?: Config;

  constructor(config?: Config) {
    this.config = config;
  }

  /**
   * Get the underlying AgentRun client instance
   */
  getClient(config?: Config): Client {
    const cfg = Config.withConfigs(this.config, config);
    let endpoint = cfg.controlEndpoint;

    // Remove protocol prefix
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

    return new $AgentRunClient(openApiConfig);
  }
}

// Re-export the AgentRun models for use in generated code
export { $AgentRun };
