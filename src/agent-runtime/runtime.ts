/**
 * Agent Runtime Resource
 *
 * 此模块定义 Agent Runtime 资源类。
 * This module defines the Agent Runtime resource class.
 */

import { Config } from '../utils/config';
import { Status } from '../utils/model';
import { listAllResourcesFunction, ResourceBase, updateObjectProperties } from '../utils/resource';
import type { NetworkConfig } from '../utils/model';

import { AgentRuntimeDataAPI, InvokeArgs } from './api/data';
import { AgentRuntimeEndpoint } from './endpoint';
import {
  AgentRuntimeCode,
  AgentRuntimeContainer,
  AgentRuntimeCreateInput,
  AgentRuntimeData,
  AgentRuntimeEndpointCreateInput,
  AgentRuntimeEndpointUpdateInput,
  AgentRuntimeHealthCheckConfig,
  AgentRuntimeListInput,
  AgentRuntimeLogConfig,
  AgentRuntimeProtocolConfig,
  AgentRuntimeUpdateInput,
  AgentRuntimeVersion,
  AgentRuntimeVersionListInput,
} from './model';

/**
 * Agent Runtime resource class
 */
export class AgentRuntime extends ResourceBase implements AgentRuntimeData {
  // System properties
  agentRuntimeArn?: string;
  agentRuntimeId?: string;
  agentRuntimeName?: string;
  agentRuntimeVersion?: string;
  artifactType?: string;
  codeConfiguration?: AgentRuntimeCode;
  containerConfiguration?: AgentRuntimeContainer;
  cpu?: number;
  createdAt?: string;
  credentialName?: string;
  description?: string;
  environmentVariables?: Record<string, string>;
  executionRoleArn?: string;
  healthCheckConfiguration?: AgentRuntimeHealthCheckConfig;
  lastUpdatedAt?: string;
  logConfiguration?: AgentRuntimeLogConfig;
  memory?: number;
  networkConfiguration?: NetworkConfig;
  port?: number;
  protocolConfiguration?: AgentRuntimeProtocolConfig;
  resourceName?: string;
  sessionConcurrencyLimitPerInstance?: number;
  sessionIdleTimeoutSeconds?: number;
  declare status?: Status;
  statusReason?: string;
  tags?: string[];

  protected _config?: Config;
  private _dataApiCache: Record<string, AgentRuntimeDataAPI> = {};

  constructor(data?: any, config?: Config) {
    super();

    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  uniqIdCallback = () => this.agentRuntimeId;

  private static getClient() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AgentRuntimeClient } = require('./client');
    return new AgentRuntimeClient();
  }

  /**
   * Create a new Agent Runtime
   */
  static async create(params: {
    input: AgentRuntimeCreateInput;
    config?: Config;
  }): Promise<AgentRuntime> {
    const { input, config } = params;
    return await AgentRuntime.getClient().create({ input, config });
  }

  /**
   * Delete an Agent Runtime by ID
   */
  static async delete(params: { id: string; config?: Config }): Promise<AgentRuntime> {
    const { id, config } = params;
    return await AgentRuntime.getClient().delete({ id, config });
  }

  /**
   * Update an Agent Runtime by ID
   */
  static async update(params: {
    id: string;
    input: AgentRuntimeUpdateInput;
    config?: Config;
  }): Promise<AgentRuntime> {
    const { id, input, config } = params;
    return await AgentRuntime.getClient().update({ id, input, config });
  }

  /**
   * Get an Agent Runtime by ID
   */
  static async get(params: { id: string; config?: Config }): Promise<AgentRuntime> {
    const { id, config } = params;
    return await AgentRuntime.getClient().get({ id, config });
  }

  /**
   * List Agent Runtimes
   */
  static async list(params?: {
    input?: AgentRuntimeListInput;
    config?: Config;
  }): Promise<AgentRuntime[]> {
    const { input, config } = params ?? {};
    return await AgentRuntime.getClient().list({ input, config });
  }

  static listAll = listAllResourcesFunction(this.list);

  /**
   * List Agent Runtime versions by ID
   */
  static async listVersionsById(params: {
    agentRuntimeId: string;
    input?: AgentRuntimeVersionListInput;
    config?: Config;
  }): Promise<AgentRuntimeVersion[]> {
    const { agentRuntimeId, input, config } = params;
    const client = AgentRuntime.getClient();
    return await client.listVersions({ agentRuntimeId, input, config });
  }

  /**
   * Delete this runtime
   */
  delete = async (params?: { config?: Config }): Promise<AgentRuntime> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to delete an Agent Runtime');
    }

    const result = await AgentRuntime.delete({
      id: this.agentRuntimeId,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Update this runtime
   */
  update = async (params: {
    input: AgentRuntimeUpdateInput;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { input, config } = params;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to update an Agent Runtime');
    }

    const result = await AgentRuntime.update({
      id: this.agentRuntimeId,
      input,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this runtime's data
   */
  get = async (params?: { config?: Config }): Promise<AgentRuntime> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to refresh an Agent Runtime');
    }

    const result = await AgentRuntime.get({
      id: this.agentRuntimeId,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Create an endpoint for this runtime
   */
  createEndpoint = async (params: {
    input: AgentRuntimeEndpointCreateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { input, config } = params;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to create an endpoint');
    }

    return AgentRuntimeEndpoint.create({
      agentRuntimeId: this.agentRuntimeId,
      input,
      config: config ?? this._config,
    });
  };

  /**
   * Delete an endpoint from this runtime
   */
  deleteEndpoint = async (params: {
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { endpointId, config } = params;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to delete an endpoint');
    }

    return AgentRuntimeEndpoint.delete({
      agentRuntimeId: this.agentRuntimeId,
      endpointId,
      config: config ?? this._config,
    });
  };

  /**
   * Update an endpoint of this runtime
   */
  updateEndpoint = async (params: {
    endpointId: string;
    input: AgentRuntimeEndpointUpdateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { endpointId, input, config } = params;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to update an endpoint');
    }

    return AgentRuntimeEndpoint.update({
      agentRuntimeId: this.agentRuntimeId,
      endpointId,
      input,
      config: config ?? this._config,
    });
  };

  /**
   * Get an endpoint of this runtime
   */
  getEndpoint = async (params: {
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { endpointId, config } = params;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to get an endpoint');
    }

    return AgentRuntimeEndpoint.get({
      agentRuntimeId: this.agentRuntimeId,
      endpointId,
      config: config ?? this._config,
    });
  };

  /**
   * List endpoints of this runtime
   */
  listEndpoints = async (params?: { config?: Config }): Promise<AgentRuntimeEndpoint[]> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to list endpoints');
    }

    return AgentRuntimeEndpoint.list({
      agentRuntimeId: this.agentRuntimeId,
      config: config ?? this._config,
    });
  };

  /**
   * List versions of this runtime
   */
  listVersions = async (params?: { config?: Config }): Promise<AgentRuntimeVersion[]> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error('agentRuntimeId is required to list versions');
    }

    return AgentRuntime.listVersionsById({
      agentRuntimeId: this.agentRuntimeId,
      config: config ?? this._config,
    });
  };

  /**
   * Invoke agent runtime using OpenAI-compatible API
   *
   * This method provides an OpenAI-compatible interface to invoke the agent runtime.
   * It creates a Data API client and forwards the invocation request.
   *
   * @param args - Invocation arguments
   * @returns OpenAI chat completion response
   *
   * @example
   * ```typescript
   * const runtime = await AgentRuntime.get({ id: "runtime-id" });
   * const response = await runtime.invokeOpenai({
   *   agentRuntimeEndpointName: "Default",
   *   messages: [{ role: "user", content: "Hello" }],
   *   stream: false
   * });
   * ```
   */
  invokeOpenai = async (args: InvokeArgs & { agentRuntimeEndpointName?: string }) => {
    const { agentRuntimeEndpointName = 'Default', messages, stream, config } = args;

    if (!this.agentRuntimeName) {
      throw new Error('agentRuntimeName is required to invoke OpenAI');
    }

    // Merge configs
    const cfg = Config.withConfigs(this._config, config);

    // Create or reuse Data API client
    if (!this._dataApiCache[agentRuntimeEndpointName]) {
      this._dataApiCache[agentRuntimeEndpointName] = new AgentRuntimeDataAPI(
        this.agentRuntimeName,
        agentRuntimeEndpointName,
        cfg
      );
    }

    return this._dataApiCache[agentRuntimeEndpointName].invokeOpenai({
      messages,
      stream,
      config: cfg,
    });
  };
}
