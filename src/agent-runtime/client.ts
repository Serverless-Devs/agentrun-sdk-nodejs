/**
 * Agent Runtime Client
 *
 * 此模块提供 Agent Runtime 的客户端 API。
 * This module provides the client API for Agent Runtime.
 */

import { Config } from '../utils/config';

import { AgentRuntimeControlAPI } from './api/control';
import { AgentRuntimeDataAPI, InvokeArgs } from './api/data';
import { AgentRuntimeEndpoint } from './endpoint';
import {
  AgentRuntimeCreateInput,
  AgentRuntimeEndpointCreateInput,
  AgentRuntimeEndpointListInput,
  AgentRuntimeEndpointUpdateInput,
  AgentRuntimeListInput,
  AgentRuntimeUpdateInput,
  AgentRuntimeVersion,
  AgentRuntimeVersionListInput,
} from './model';
import { AgentRuntime } from './runtime';

/**
 * Agent Runtime Client
 *
 * 提供 Agent Runtime 的创建、删除、更新、查询和端点管理功能。
 * Provides create, delete, update, query and endpoint management functions for Agent Runtime.
 */
export class AgentRuntimeClient {
  private config?: Config;
  private controlApi: AgentRuntimeControlAPI;

  constructor(config?: Config) {
    this.config = config;
    this.controlApi = new AgentRuntimeControlAPI(config);
  }

  /**
   * Create an Agent Runtime
   */
  create = async (params: {
    input: AgentRuntimeCreateInput;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { input, config } = params;
    return AgentRuntime.create({ input, config: config ?? this.config });
  };

  /**
   * Delete an Agent Runtime
   */
  delete = async (params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { id, config } = params;
    return AgentRuntime.delete({ id, config: config ?? this.config });
  };

  /**
   * Update an Agent Runtime
   */
  update = async (params: {
    id: string;
    input: AgentRuntimeUpdateInput;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { id, input, config } = params;
    return AgentRuntime.update({ id, input, config: config ?? this.config });
  };

  /**
   * Get an Agent Runtime
   */
  get = async (params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { id, config } = params;
    return AgentRuntime.get({ id, config: config ?? this.config });
  };

  /**
   * List Agent Runtimes
   */
  list = async (params?: {
    input?: AgentRuntimeListInput;
    config?: Config;
  }): Promise<AgentRuntime[]> => {
    const { input, config } = params ?? {};
    return AgentRuntime.list({ input, config: config ?? this.config });
  };

  // /**
  //  * List all Agent Runtimes (with pagination)
  //  */
  // listAll = async (params?: {
  //   options?: {
  //     agentRuntimeName?: string;
  //     tags?: string;
  //     searchMode?: string;
  //   };
  //   config?: Config;
  // }): Promise<AgentRuntime[]> => {
  //   const { options, config } = params ?? {};
  //   return AgentRuntime.listAll(options, config ?? this.config);
  // };

  /**
   * Create an endpoint for an Agent Runtime
   */
  createEndpoint = async (params: {
    agentRuntimeId: string;
    input: AgentRuntimeEndpointCreateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { agentRuntimeId, input, config } = params;
    return AgentRuntimeEndpoint.create({
      agentRuntimeId,
      input,
      config: config ?? this.config,
    });
  };

  /**
   * Delete an endpoint
   */
  deleteEndpoint = async (params: {
    agentRuntimeId: string;
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { agentRuntimeId, endpointId, config } = params;
    return AgentRuntimeEndpoint.delete({
      agentRuntimeId,
      endpointId,
      config: config ?? this.config,
    });
  };

  /**
   * Update an endpoint
   */
  updateEndpoint = async (params: {
    agentRuntimeId: string;
    endpointId: string;
    input: AgentRuntimeEndpointUpdateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { agentRuntimeId, endpointId, input, config } = params;
    return AgentRuntimeEndpoint.update({
      agentRuntimeId,
      endpointId,
      input,
      config: config ?? this.config,
    });
  };

  /**
   * Get an endpoint
   */
  getEndpoint = async (params: {
    agentRuntimeId: string;
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { agentRuntimeId, endpointId, config } = params;
    return AgentRuntimeEndpoint.get({
      agentRuntimeId,
      endpointId,
      config: config ?? this.config,
    });
  };

  /**
   * List endpoints for an Agent Runtime
   */
  listEndpoints = async (params: {
    agentRuntimeId: string;
    input?: AgentRuntimeEndpointListInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint[]> => {
    const { agentRuntimeId, input, config } = params;
    return AgentRuntimeEndpoint.listById({
      agentRuntimeId,
      input,
      config: config ?? this.config,
    });
  };

  /**
   * List versions for an Agent Runtime
   */
  listVersions = async (params: {
    agentRuntimeId: string;
    input?: AgentRuntimeVersionListInput;
    config?: Config;
  }): Promise<AgentRuntimeVersion[]> => {
    const { agentRuntimeId, input, config } = params;
    return AgentRuntime.listVersionsById({
      agentRuntimeId,
      input,
      config: config ?? this.config,
    });
  };

  /**
   * Invoke agent runtime using OpenAI-compatible API
   *
   * This method provides an OpenAI-compatible interface to invoke the agent runtime.
   *
   * @param params - Parameters including agent runtime name, endpoint name, and invocation args
   * @returns OpenAI chat completion response
   *
   * @example
   * ```typescript
   * const client = new AgentRuntimeClient();
   * const response = await client.invokeOpenai({
   *   agentRuntimeName: "my-runtime",
   *   agentRuntimeEndpointName: "Default",
   *   messages: [{ role: "user", content: "Hello" }],
   *   stream: false
   * });
   * ```
   */
  invokeOpenai = async (
    params: {
      agentRuntimeName: string;
      agentRuntimeEndpointName?: string;
    } & InvokeArgs
  ) => {
    const {
      agentRuntimeName,
      agentRuntimeEndpointName = 'Default',
      messages,
      stream,
      config,
    } = params;

    // Merge configs
    const cfg = Config.withConfigs(this.config, config);

    // Create Data API client
    const dataApi = new AgentRuntimeDataAPI(
      agentRuntimeName,
      agentRuntimeEndpointName,
      cfg
    );

    return dataApi.invokeOpenai({
      messages,
      stream,
      config: cfg,
    });
  };
}
