/**
 * Agent Runtime Endpoint Resource
 *
 * 此模块定义 Agent Runtime Endpoint 资源类。
 * This module defines the Agent Runtime Endpoint resource class.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";

import { Config } from "../utils/config";
import { HTTPError } from "../utils/exception";
import { updateObjectProperties } from "../utils/resource";
import { Status } from "../utils/model";

import { AgentRuntimeControlAPI } from "./api/control";
import { AgentRuntimeDataAPI, InvokeArgs } from "./api/data";
import {
  AgentRuntimeEndpointCreateInput,
  AgentRuntimeEndpointUpdateInput,
  AgentRuntimeEndpointListInput,
  AgentRuntimeEndpointData,
  AgentRuntimeEndpointRoutingConfig,
} from "./model";

/**
 * Agent Runtime Endpoint resource class
 */
export class AgentRuntimeEndpoint implements AgentRuntimeEndpointData {
  // System properties
  agentRuntimeEndpointArn?: string;
  agentRuntimeEndpointId?: string;
  agentRuntimeEndpointName?: string;
  agentRuntimeId?: string;
  description?: string;
  endpointPublicUrl?: string;
  resourceName?: string;
  routingConfiguration?: AgentRuntimeEndpointRoutingConfig;
  status?: Status;
  statusReason?: string;
  tags?: string[];
  targetVersion?: string;

  private _config?: Config;
  private _dataApi?: AgentRuntimeDataAPI;
  private _agentRuntimeName?: string;

  constructor(data?: Partial<AgentRuntimeEndpointData>, config?: Config) {
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Create endpoint from SDK response object
   */
  static fromInnerObject(
    obj: $AgentRun.AgentRuntimeEndpoint,
    config?: Config,
  ): AgentRuntimeEndpoint {
    return new AgentRuntimeEndpoint(
      {
        agentRuntimeEndpointArn: obj.agentRuntimeEndpointArn,
        agentRuntimeEndpointId: obj.agentRuntimeEndpointId,
        agentRuntimeEndpointName: obj.agentRuntimeEndpointName,
        agentRuntimeId: obj.agentRuntimeId,
        description: obj.description,
        endpointPublicUrl: obj.endpointPublicUrl,
        resourceName: obj.resourceName,
        status: obj.status as Status,
        statusReason: obj.statusReason,
        tags: obj.tags,
        targetVersion: obj.targetVersion,
      },
      config,
    );
  }

  private static getClient(): AgentRuntimeControlAPI {
    return new AgentRuntimeControlAPI();
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
    const client = AgentRuntimeEndpoint.getClient();
    try {
      // Set default targetVersion to "LATEST" if not provided (same as Python SDK)
      const targetVersion = input.targetVersion || 'LATEST';
      
      const result = await client.createAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        input: new $AgentRun.CreateAgentRuntimeEndpointInput({
          agentRuntimeEndpointName: input.agentRuntimeEndpointName,
          description: input.description,
          tags: input.tags,
          targetVersion: targetVersion,
        }),
        config,
      });
      return AgentRuntimeEndpoint.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          "AgentRuntimeEndpoint",
          `${agentRuntimeId}/${input.agentRuntimeEndpointName}`,
        );
      }
      throw error;
    }
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
    const client = AgentRuntimeEndpoint.getClient();
    try {
      const result = await client.deleteAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        config,
      });
      return AgentRuntimeEndpoint.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          "AgentRuntimeEndpoint",
          `${agentRuntimeId}/${endpointId}`,
        );
      }
      throw error;
    }
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
    const client = AgentRuntimeEndpoint.getClient();
    try {
      const result = await client.updateAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        input: new $AgentRun.UpdateAgentRuntimeEndpointInput({
          agentRuntimeEndpointName: input.agentRuntimeEndpointName,
          description: input.description,
          tags: input.tags,
          targetVersion: input.targetVersion,
        }),
        config,
      });
      return AgentRuntimeEndpoint.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          "AgentRuntimeEndpoint",
          `${agentRuntimeId}/${endpointId}`,
        );
      }
      throw error;
    }
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
    const client = AgentRuntimeEndpoint.getClient();
    try {
      const result = await client.getAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        config,
      });
      return AgentRuntimeEndpoint.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          "AgentRuntimeEndpoint",
          `${agentRuntimeId}/${endpointId}`,
        );
      }
      throw error;
    }
  }

  /**
   * List endpoints by Agent Runtime ID
   */
  static async listById(params: {
    agentRuntimeId: string;
    input?: AgentRuntimeEndpointListInput;
    config?: Config;
  }): Promise<AgentRuntimeEndpoint[]> {
    const { agentRuntimeId, input, config } = params;
    const client = AgentRuntimeEndpoint.getClient();
    try {
      const request = new $AgentRun.ListAgentRuntimeEndpointsRequest({
        pageNumber: input?.pageNumber,
        pageSize: input?.pageSize,
      });
      const result = await client.listAgentRuntimeEndpoints({
        agentId: agentRuntimeId,
        input: request,
        config,
      });
      return (result.items || []).map((item) =>
        AgentRuntimeEndpoint.fromInnerObject(item, config),
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("AgentRuntime", agentRuntimeId);
      }
      throw error;
    }
  }

  /**
   * Delete this endpoint
   */
  delete = async (params?: { config?: Config }): Promise<AgentRuntimeEndpoint> => {
    const config = params?.config;
    if (!this.agentRuntimeId || !this.agentRuntimeEndpointId) {
      throw new Error(
        "agentRuntimeId and agentRuntimeEndpointId are required to delete an endpoint",
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
        "agentRuntimeId and agentRuntimeEndpointId are required to update an endpoint",
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
        "agentRuntimeId and agentRuntimeEndpointId are required to refresh an endpoint",
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
   * Wait until the endpoint is ready
   */
  waitUntilReady = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (endpoint: AgentRuntimeEndpoint) => void;
    },
    config?: Config,
  ): Promise<AgentRuntimeEndpoint> => {
    const timeout = (options?.timeoutSeconds ?? 300) * 1000;
    const interval = (options?.intervalSeconds ?? 5) * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.refresh({ config });

      if (options?.beforeCheck) {
        options.beforeCheck(this);
      }

      if (this.status === Status.READY) {
        return this;
      }

      if (
        this.status === Status.CREATE_FAILED ||
        this.status === Status.UPDATE_FAILED ||
        this.status === Status.DELETE_FAILED
      ) {
        throw new Error(`Endpoint failed: ${this.statusReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for endpoint to be ready after ${options?.timeoutSeconds ?? 300} seconds`,
    );
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
        const runtime = await client.getAgentRuntime({
          agentId: this.agentRuntimeId,
          config: cfg,
        });
        this._agentRuntimeName = runtime.agentRuntimeName;
      }

      if (!this._agentRuntimeName) {
        throw new Error(
          "Unable to determine agent runtime name for this endpoint",
        );
      }

      this._dataApi = new AgentRuntimeDataAPI(
        this._agentRuntimeName,
        this.agentRuntimeEndpointName || "",
        cfg,
      );
    }

    return this._dataApi.invokeOpenai({
      messages,
      stream,
      config: cfg,
    });
  };
}
