/**
 * Agent Runtime Endpoint Resource
 *
 * 此模块定义 Agent Runtime Endpoint 资源类。
 * This module defines the Agent Runtime Endpoint resource class.
 */

import { Config } from '../utils/config';
import { listAllResourcesFunction, ResourceBase, updateObjectProperties } from '../utils/resource';
import { PageableInput, Status } from '../utils/model';

import { AgentRuntimeDataAPI, InvokeArgs } from './api/data';
import {
  AgentRuntimeEndpointCreateInput,
  AgentRuntimeEndpointUpdateInput,
  AgentRuntimeEndpointListInput,
  AgentRuntimeEndpointData,
  AgentRuntimeEndpointRoutingConfig,
} from './model';
import { KeyOf } from 'zod/v4/core/util.cjs';

/**
 * Agent Runtime Endpoint resource class
 */
export class AgentRuntimeEndpoint extends ResourceBase implements AgentRuntimeEndpointData {
  // System properties
  agentRuntimeEndpointArn?: string;
  agentRuntimeEndpointId?: string;
  agentRuntimeEndpointName?: string;
  agentRuntimeId?: string;
  description?: string;
  endpointPublicUrl?: string;
  resourceName?: string;
  routingConfiguration?: AgentRuntimeEndpointRoutingConfig;
  declare status?: Status;
  statusReason?: string;
  tags?: string[];
  targetVersion?: string;

  protected _config?: Config;
  private _dataApi?: AgentRuntimeDataAPI;
  private _agentRuntimeName?: string;

  constructor(data?: any, config?: Config) {
    super();
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  uniqIdCallback = () => this.agentRuntimeEndpointId;

  private static getClient() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AgentRuntimeClient } = require('./client');
    return new AgentRuntimeClient();
  }

  /**
   * Create an endpoint by Agent Runtime ID
   */
  static async create(params: {
    agentRuntimeId: string;
    input: AgentRuntimeEndpointCreateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> {
    const { agentRuntimeId, input, config } = params;
    return await AgentRuntimeEndpoint.getClient().createEndpoint({
      agentRuntimeId,
      input,
      config,
    });
  }

  /**
   * Delete an endpoint by ID
   */
  static async delete(params: {
    agentRuntimeId: string;
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> {
    const { agentRuntimeId, endpointId, config } = params;
    return await AgentRuntimeEndpoint.getClient().deleteEndpoint({
      agentRuntimeId,
      endpointId,
      config,
    });
  }

  /**
   * Update an endpoint by ID
   */
  static async update(params: {
    agentRuntimeId: string;
    endpointId: string;
    input: AgentRuntimeEndpointUpdateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> {
    const { agentRuntimeId, endpointId, input, config } = params;
    return await AgentRuntimeEndpoint.getClient().updateEndpoint({
      agentRuntimeId,
      endpointId,
      input,
      config,
    });
  }

  /**
   * Get an endpoint by ID
   */
  static async get(params: {
    agentRuntimeId: string;
    endpointId: string;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> {
    const { agentRuntimeId, endpointId, config } = params;
    return await AgentRuntimeEndpoint.getClient().getEndpoint({
      agentRuntimeId,
      endpointId,
      config,
    });
  }

  /**
   * List endpoints by Agent Runtime ID
   */
  static async list(params: {
    agentRuntimeId: string;
    input?: AgentRuntimeEndpointListInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint[]> {
    const { agentRuntimeId, input, config } = params;
    return await AgentRuntimeEndpoint.getClient().listEndpoints({
      agentRuntimeId,
      input,
      config,
    });
  }

  static listAll = async (
    params: {
      agentRuntimeId: string;
      config?: Config;
    } & Omit<AgentRuntimeEndpointListInput, KeyOf<PageableInput>>
  ) => {
    const { agentRuntimeId, ...restParams } = params;

    return await listAllResourcesFunction(
      (params?: { input?: AgentRuntimeEndpointListInput; config?: Config }) =>
        this.list({ ...params, agentRuntimeId })
    )(restParams);
  };

  get = async (params?: { config?: Config }) => {
    return await AgentRuntimeEndpoint.get({
      agentRuntimeId: this.agentRuntimeId!,
      endpointId: this.agentRuntimeEndpointId!,
      config: params?.config,
    });
  };

  /**
   * Delete this endpoint
   */
  delete = async (params?: { config?: Config }): Promise<AgentRuntimeEndpoint> => {
    const config = params?.config;
    if (!this.agentRuntimeId || !this.agentRuntimeEndpointId) {
      throw new Error(
        'agentRuntimeId and agentRuntimeEndpointId are required to delete an endpoint'
      );
    }

    const result = await AgentRuntimeEndpoint.delete({
      agentRuntimeId: this.agentRuntimeId,
      endpointId: this.agentRuntimeEndpointId,
      config: config ?? this._config,
    });

    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Update this endpoint
   */
  update = async (params: {
    input: AgentRuntimeEndpointUpdateInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint> => {
    const { input, config } = params;
    if (!this.agentRuntimeId || !this.agentRuntimeEndpointId) {
      throw new Error(
        'agentRuntimeId and agentRuntimeEndpointId are required to update an endpoint'
      );
    }

    const result = await AgentRuntimeEndpoint.update({
      agentRuntimeId: this.agentRuntimeId,
      endpointId: this.agentRuntimeEndpointId,
      input,
      config: config ?? this._config,
    });

    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this endpoint's data
   */
  refresh = async (params?: { config?: Config }): Promise<AgentRuntimeEndpoint> => {
    const config = params?.config;
    if (!this.agentRuntimeId || !this.agentRuntimeEndpointId) {
      throw new Error(
        'agentRuntimeId and agentRuntimeEndpointId are required to refresh an endpoint'
      );
    }

    const result = await AgentRuntimeEndpoint.get({
      agentRuntimeId: this.agentRuntimeId,
      endpointId: this.agentRuntimeEndpointId,
      config: config ?? this._config,
    });

    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Invoke agent runtime using OpenAI-compatible API through this endpoint
   *
   * This method provides an OpenAI-compatible interface to invoke the agent runtime
   * through this specific endpoint.
   *
   * @param args - Invocation arguments
   * @returns OpenAI chat completion response
   *
   * @example
   * ```typescript
   * const endpoint = await AgentRuntimeEndpoint.get({
   *   agentRuntimeId: "runtime-id",
   *   endpointId: "endpoint-id"
   * });
   * const response = await endpoint.invokeOpenai({
   *   messages: [{ role: "user", content: "Hello" }],
   *   stream: false
   * });
   * ```
   */
  invokeOpenai = async (args: InvokeArgs) => {
    const { messages, stream, config } = args;

    // Merge configs
    const cfg = Config.withConfigs(this._config, config);

    // Create Data API client if not already created
    if (!this._dataApi) {
      // Get agent runtime name if not available
      if (!this._agentRuntimeName && this.agentRuntimeId) {
        const client = AgentRuntimeEndpoint.getClient();
        const runtime = await client.get({
          id: this.agentRuntimeId,
          config: cfg,
        });
        this._agentRuntimeName = runtime.agentRuntimeName;
      }

      if (!this._agentRuntimeName) {
        throw new Error('Unable to determine agent runtime name for this endpoint');
      }

      this._dataApi = new AgentRuntimeDataAPI(
        this._agentRuntimeName,
        this.agentRuntimeEndpointName || '',
        cfg
      );
    }

    return this._dataApi.invokeOpenai({
      messages,
      stream,
      config: cfg,
    });
  };
}
