/**
 * Agent Runtime Resource
 *
 * 此模块定义 Agent Runtime 资源类。
 * This module defines the Agent Runtime resource class.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";

import { Config } from "../utils/config";
import { HTTPError } from "../utils/exception";
import { Status, NetworkMode } from "../utils/model";
import { updateObjectProperties } from "../utils/resource";
import type { NetworkConfig } from "../utils/model";

import { AgentRuntimeControlAPI } from "./api/control";
import { AgentRuntimeDataAPI, InvokeArgs } from "./api/data";
import { AgentRuntimeEndpoint } from "./endpoint";
import {
  AgentRuntimeArtifact,
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
} from "./model";

/**
 * Agent Runtime resource class
 */
export class AgentRuntime implements AgentRuntimeData {
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
  status?: Status;
  statusReason?: string;
  tags?: string[];

  private _config?: Config;
  private _dataApiCache: Record<string, AgentRuntimeDataAPI> = {};

  constructor(data?: Partial<AgentRuntimeData>, config?: Config) {
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Create runtime from SDK response object
   */
  static fromInnerObject(
    obj: $AgentRun.AgentRuntime,
    config?: Config,
  ): AgentRuntime {
    return new AgentRuntime(
      {
        agentRuntimeArn: obj.agentRuntimeArn,
        agentRuntimeId: obj.agentRuntimeId,
        agentRuntimeName: obj.agentRuntimeName,
        agentRuntimeVersion: obj.agentRuntimeVersion,
        artifactType: obj.artifactType,
        codeConfiguration: obj.codeConfiguration as AgentRuntimeCode | undefined,
        containerConfiguration: obj.containerConfiguration,
        cpu: obj.cpu,
        createdAt: obj.createdAt,
        credentialName: obj.credentialName,
        description: obj.description,
        environmentVariables: obj.environmentVariables,
        executionRoleArn: obj.executionRoleArn,
        healthCheckConfiguration: obj.healthCheckConfiguration,
        lastUpdatedAt: obj.lastUpdatedAt,
        logConfiguration: obj.logConfiguration as AgentRuntimeLogConfig | undefined,
        memory: obj.memory,
        networkConfiguration: obj.networkConfiguration as NetworkConfig | undefined,
        port: obj.port,
        protocolConfiguration: obj.protocolConfiguration as AgentRuntimeProtocolConfig | undefined,
        resourceName: obj.resourceName,
        sessionConcurrencyLimitPerInstance:
          obj.sessionConcurrencyLimitPerInstance,
        sessionIdleTimeoutSeconds: obj.sessionIdleTimeoutSeconds,
        status: obj.status as Status,
        statusReason: obj.statusReason,
        tags: obj.tags,
      },
      config,
    );
  }

  private static getClient(): AgentRuntimeControlAPI {
    return new AgentRuntimeControlAPI();
  }

  /**
   * Create a new Agent Runtime
   */
  static async create(params: {
    input: AgentRuntimeCreateInput;
    config?: Config;
  }): Promise<AgentRuntime> {
    const { input, config } = params;
    const client = AgentRuntime.getClient();

    // Set default network configuration
    if (!input.networkConfiguration) {
      input.networkConfiguration = {};
    }

    // Auto-detect artifact type
    if (!input.artifactType) {
      if (input.codeConfiguration) {
        input.artifactType = AgentRuntimeArtifact.CODE;
      } else if (input.containerConfiguration) {
        input.artifactType = AgentRuntimeArtifact.CONTAINER;
      } else {
        throw new Error(
          "Either codeConfiguration or containerConfiguration must be provided",
        );
      }
    }

    try {
      const result = await client.createAgentRuntime({
        input: new $AgentRun.CreateAgentRuntimeInput({
          agentRuntimeName: input.agentRuntimeName,
          artifactType: input.artifactType,
          codeConfiguration: input.codeConfiguration
            ? new $AgentRun.CodeConfiguration({
                checksum: input.codeConfiguration.checksum,
                command: input.codeConfiguration.command,
                language: input.codeConfiguration.language,
                ossBucketName: input.codeConfiguration.ossBucketName,
                ossObjectName: input.codeConfiguration.ossObjectName,
                zipFile: input.codeConfiguration.zipFile,
              })
            : undefined,
          containerConfiguration: input.containerConfiguration
            ? new $AgentRun.ContainerConfiguration({
                command: input.containerConfiguration.command,
                image: input.containerConfiguration.image,
              })
            : undefined,
          cpu: input.cpu,
          credentialName: input.credentialName,
          description: input.description,
          environmentVariables: input.environmentVariables,
          executionRoleArn: input.executionRoleArn,
          memory: input.memory,
          networkConfiguration: input.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                networkMode: input.networkConfiguration.networkMode || NetworkMode.PUBLIC, // 默认使用公网模式
                securityGroupId: input.networkConfiguration.securityGroupId,
                vpcId: input.networkConfiguration.vpcId,
                vswitchIds: input.networkConfiguration.vSwitchIds,
              })
            : undefined,
          port: input.port,
          sessionConcurrencyLimitPerInstance:
            input.sessionConcurrencyLimitPerInstance,
          sessionIdleTimeoutSeconds: input.sessionIdleTimeoutSeconds,
          tags: input.tags,
        }),
        config,
      });
      return AgentRuntime.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("AgentRuntime", input.agentRuntimeName);
      }
      throw error;
    }
  }

  /**
   * Delete an Agent Runtime by ID
   */
  static async delete(params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> {
    const { id, config } = params;
    const client = AgentRuntime.getClient();

    // First delete all endpoints
    const endpoints = await AgentRuntimeEndpoint.listById({
      agentRuntimeId: id,
      config,
    });
    for (const endpoint of endpoints) {
      await endpoint.delete({ config });
    }

    // Wait for all endpoints to be deleted
    let remaining = await AgentRuntimeEndpoint.listById({
      agentRuntimeId: id,
      config,
    });
    while (remaining.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      remaining = await AgentRuntimeEndpoint.listById({
        agentRuntimeId: id,
        config,
      });
    }

    try {
      const result = await client.deleteAgentRuntime({ agentId: id, config });
      return AgentRuntime.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("AgentRuntime", id);
      }
      throw error;
    }
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
    const client = AgentRuntime.getClient();
    try {
      const result = await client.updateAgentRuntime({
        agentId: id,
        input: new $AgentRun.UpdateAgentRuntimeInput({
          agentRuntimeName: input.agentRuntimeName,
          artifactType: input.artifactType,
          codeConfiguration: input.codeConfiguration
            ? new $AgentRun.CodeConfiguration({
                checksum: input.codeConfiguration.checksum,
                command: input.codeConfiguration.command,
                language: input.codeConfiguration.language,
                ossBucketName: input.codeConfiguration.ossBucketName,
                ossObjectName: input.codeConfiguration.ossObjectName,
                zipFile: input.codeConfiguration.zipFile,
              })
            : undefined,
          containerConfiguration: input.containerConfiguration
            ? new $AgentRun.ContainerConfiguration({
                command: input.containerConfiguration.command,
                image: input.containerConfiguration.image,
              })
            : undefined,
          cpu: input.cpu,
          credentialName: input.credentialName,
          description: input.description,
          environmentVariables: input.environmentVariables,
          executionRoleArn: input.executionRoleArn,
          memory: input.memory,
          port: input.port,
          sessionConcurrencyLimitPerInstance:
            input.sessionConcurrencyLimitPerInstance,
          sessionIdleTimeoutSeconds: input.sessionIdleTimeoutSeconds,
          tags: input.tags,
        }),
        config,
      });
      return AgentRuntime.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("AgentRuntime", id);
      }
      throw error;
    }
  }

  /**
   * Get an Agent Runtime by ID
   */
  static async get(params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> {
    const { id, config } = params;
    const client = AgentRuntime.getClient();
    try {
      const result = await client.getAgentRuntime({ agentId: id, config });
      return AgentRuntime.fromInnerObject(result, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("AgentRuntime", id);
      }
      throw error;
    }
  }

  /**
   * List Agent Runtimes
   */
  static async list(
    input?: AgentRuntimeListInput,
    config?: Config,
  ): Promise<AgentRuntime[]> {
    const client = AgentRuntime.getClient();
    const request = new $AgentRun.ListAgentRuntimesRequest({
      pageNumber: input?.pageNumber,
      pageSize: input?.pageSize,
      agentRuntimeName: input?.agentRuntimeName,
      tags: input?.tags,
    });
    const result = await client.listAgentRuntimes({ input: request, config });
    return (result.items || []).map((item) =>
      AgentRuntime.fromInnerObject(item, config),
    );
  }

  /**
   * List all Agent Runtimes (with pagination)
   */
  static async listAll(
    options?: {
      agentRuntimeName?: string;
      tags?: string;
      searchMode?: string;
    },
    config?: Config,
  ): Promise<AgentRuntime[]> {
    const runtimes: AgentRuntime[] = [];
    let page = 1;
    const pageSize = 50;

    while (true) {
      const result = await AgentRuntime.list(
        {
          pageNumber: page,
          pageSize,
          agentRuntimeName: options?.agentRuntimeName,
          tags: options?.tags,
          searchMode: options?.searchMode,
        },
        config,
      );

      runtimes.push(...result);
      page++;

      if (result.length < pageSize) {
        break;
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return runtimes.filter((r) => {
      if (!r.agentRuntimeId || seen.has(r.agentRuntimeId)) {
        return false;
      }
      seen.add(r.agentRuntimeId);
      return true;
    });
  }

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
    const versions: AgentRuntimeVersion[] = [];
    let page = 1;
    const pageSize = 50;

    while (true) {
      const request = new $AgentRun.ListAgentRuntimeVersionsRequest({
        pageNumber: input?.pageNumber ?? page,
        pageSize: input?.pageSize ?? pageSize,
      });
      const result = await client.listAgentRuntimeVersions({
        agentId: agentRuntimeId,
        input: request,
        config,
      });

      if (result.items) {
        for (const item of result.items) {
          versions.push({
            agentRuntimeArn: item.agentRuntimeArn,
            agentRuntimeId: item.agentRuntimeId,
            agentRuntimeName: item.agentRuntimeName,
            agentRuntimeVersion: item.agentRuntimeVersion,
            description: item.description,
            lastUpdatedAt: item.lastUpdatedAt,
          });
        }
      }

      if (!result.items || result.items.length < pageSize) {
        break;
      }

      page++;
    }

    // Deduplicate
    const seen = new Set<string>();
    return versions.filter((v) => {
      if (!v.agentRuntimeVersion || seen.has(v.agentRuntimeVersion)) {
        return false;
      }
      seen.add(v.agentRuntimeVersion);
      return true;
    });
  }

  /**
   * Delete this runtime
   */
  delete = async (params?: { config?: Config }): Promise<AgentRuntime> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error("agentRuntimeId is required to delete an Agent Runtime");
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
      throw new Error("agentRuntimeId is required to update an Agent Runtime");
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
  refresh = async (params?: { config?: Config }): Promise<AgentRuntime> => {
    const config = params?.config;
    if (!this.agentRuntimeId) {
      throw new Error("agentRuntimeId is required to refresh an Agent Runtime");
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
      throw new Error("agentRuntimeId is required to create an endpoint");
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
      throw new Error("agentRuntimeId is required to delete an endpoint");
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
      throw new Error("agentRuntimeId is required to update an endpoint");
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
      throw new Error("agentRuntimeId is required to get an endpoint");
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
      throw new Error("agentRuntimeId is required to list endpoints");
    }

    return AgentRuntimeEndpoint.listById({
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
      throw new Error("agentRuntimeId is required to list versions");
    }

    return AgentRuntime.listVersionsById({
      agentRuntimeId: this.agentRuntimeId,
      config: config ?? this._config,
    });
  };

  /**
   * Wait until the runtime is ready
   */
  waitUntilReady = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (runtime: AgentRuntime) => void;
    },
    config?: Config,
  ): Promise<AgentRuntime> => {
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
        throw new Error(`Agent Runtime failed: ${this.statusReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for Agent Runtime to be ready after ${options?.timeoutSeconds ?? 300} seconds`,
    );
  };

  /**
   * Wait until agent runtime reaches READY or any FAILED state
   * Similar to waitUntilReady but does not throw on FAILED states
   * Compatible with Python SDK's wait_until_ready_or_failed method
   */
  waitUntilReadyOrFailed = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (runtime: AgentRuntime) => void;
    },
    config?: Config,
  ): Promise<AgentRuntime> => {
    const timeout = (options?.timeoutSeconds ?? 300) * 1000;
    const interval = (options?.intervalSeconds ?? 5) * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.refresh({ config });

      if (options?.beforeCheck) {
        options.beforeCheck(this);
      }

      // Check if reached any final state
      if (
        this.status === Status.READY ||
        this.status === Status.CREATE_FAILED ||
        this.status === Status.UPDATE_FAILED ||
        this.status === Status.DELETE_FAILED
      ) {
        return this;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for Agent Runtime to reach final state after ${options?.timeoutSeconds ?? 300} seconds`,
    );
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
  invokeOpenai = async (
    args: InvokeArgs & { agentRuntimeEndpointName?: string },
  ) => {
    const {
      agentRuntimeEndpointName = "Default",
      messages,
      stream,
      config,
    } = args;

    if (!this.agentRuntimeName) {
      throw new Error("agentRuntimeName is required to invoke OpenAI");
    }

    // Merge configs
    const cfg = Config.withConfigs(this._config, config);

    // Create or reuse Data API client
    if (!this._dataApiCache[agentRuntimeEndpointName]) {
      this._dataApiCache[agentRuntimeEndpointName] = new AgentRuntimeDataAPI(
        this.agentRuntimeName,
        agentRuntimeEndpointName,
        cfg,
      );
    }

    return this._dataApiCache[agentRuntimeEndpointName].invokeOpenai({
      messages,
      stream,
      config: cfg,
    });
  };
}
