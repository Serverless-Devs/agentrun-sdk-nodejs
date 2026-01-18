/**
 * Agent Runtime Client
 *
 * 此模块提供 Agent Runtime 的客户端 API。
 * This module provides the client API for Agent Runtime.
 */

import * as $AgentRun from '@alicloud/agentrun20250910';
import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';
import { NetworkMode } from '../utils/model';

import { AgentRuntimeControlAPI } from './api/control';
import { AgentRuntimeDataAPI, InvokeArgs } from './api/data';
import { AgentRuntimeEndpoint } from './endpoint';
import {
  AgentRuntimeArtifact,
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
    const cfg = Config.withConfigs(this.config, config);

    try {
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
            'Either codeConfiguration or containerConfiguration must be provided'
          );
        }
      }

      const result = await this.controlApi.createAgentRuntime({
        input: new $AgentRun.CreateAgentRuntimeInput({
          ...input,
          codeConfiguration: input.codeConfiguration
            ? new $AgentRun.CodeConfiguration({
                ...input.codeConfiguration,
              })
            : undefined,
          containerConfiguration: input.containerConfiguration
            ? new $AgentRun.ContainerConfiguration({
                ...input.containerConfiguration,
              })
            : undefined,
          networkConfiguration: input.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                networkMode:
                  input.networkConfiguration.networkMode || NetworkMode.PUBLIC,
                securityGroupId: input.networkConfiguration.securityGroupId,
                vpcId: input.networkConfiguration.vpcId,
                vswitchIds: input.networkConfiguration.vSwitchIds,
              })
            : undefined,
        }),
        config: cfg,
      });

      return new AgentRuntime(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('AgentRuntime', input.agentRuntimeName);
      }
      throw error;
    }
  };

  /**
   * Delete an Agent Runtime
   */
  delete = async (params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { id, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      // First delete all endpoints
      const endpoints = await this.listEndpoints({
        agentRuntimeId: id,
        config: cfg,
      });
      for (const endpoint of endpoints) {
        await endpoint.delete({ config: cfg });
      }

      // Wait for all endpoints to be deleted
      let remaining = await this.listEndpoints({
        agentRuntimeId: id,
        config: cfg,
      });
      while (remaining.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        remaining = await this.listEndpoints({
          agentRuntimeId: id,
          config: cfg,
        });
      }

      const result = await this.controlApi.deleteAgentRuntime({
        agentId: id,
        config: cfg,
      });

      return new AgentRuntime(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('AgentRuntime', id);
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.updateAgentRuntime({
        agentId: id,
        input: new $AgentRun.UpdateAgentRuntimeInput({
          ...input,
          codeConfiguration: input.codeConfiguration
            ? new $AgentRun.CodeConfiguration({
                ...input.codeConfiguration,
              })
            : undefined,
          containerConfiguration: input.containerConfiguration
            ? new $AgentRun.ContainerConfiguration({
                ...input.containerConfiguration,
              })
            : undefined,
        }),
        config: cfg,
      });

      return new AgentRuntime(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('AgentRuntime', id);
      }
      throw error;
    }
  };

  /**
   * Get an Agent Runtime
   */
  get = async (params: {
    id: string;
    config?: Config;
  }): Promise<AgentRuntime> => {
    const { id, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.getAgentRuntime({
        agentId: id,
        config: cfg,
      });
      return new AgentRuntime(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('AgentRuntime', id);
      }
      throw error;
    }
  };

  /**
   * List Agent Runtimes
   */
  list = async (params?: {
    input?: AgentRuntimeListInput;
    config?: Config;
  }): Promise<AgentRuntime[]> => {
    const { input, config } = params ?? {};
    const cfg = Config.withConfigs(this.config, config);
    const request = new $AgentRun.ListAgentRuntimesRequest({
      ...input,
    });
    const result = await this.controlApi.listAgentRuntimes({
      input: request,
      config: cfg,
    });
    return (result.items || []).map((item) => new AgentRuntime(item, cfg));
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      // Set default targetVersion to "LATEST" if not provided (same as Python SDK)
      const targetVersion = input.targetVersion || 'LATEST';

      const result = await this.controlApi.createAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        input: new $AgentRun.CreateAgentRuntimeEndpointInput({
          ...input,
          targetVersion,
        }),
        config: cfg,
      });

      return new AgentRuntimeEndpoint(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          'AgentRuntimeEndpoint',
          `${agentRuntimeId}/${input.agentRuntimeEndpointName}`
        );
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.deleteAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        config: cfg,
      });
      return new AgentRuntimeEndpoint(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          'AgentRuntimeEndpoint',
          `${agentRuntimeId}/${endpointId}`
        );
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.updateAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        input: new $AgentRun.UpdateAgentRuntimeEndpointInput({
          ...input,
        }),
        config: cfg,
      });
      return new AgentRuntimeEndpoint(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          'AgentRuntimeEndpoint',
          `${agentRuntimeId}/${endpointId}`
        );
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.getAgentRuntimeEndpoint({
        agentId: agentRuntimeId,
        endpointId,
        config: cfg,
      });
      return new AgentRuntimeEndpoint(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError(
          'AgentRuntimeEndpoint',
          `${agentRuntimeId}/${endpointId}`
        );
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);

    try {
      const request = new $AgentRun.ListAgentRuntimeEndpointsRequest({
        ...input,
      });
      const result = await this.controlApi.listAgentRuntimeEndpoints({
        agentId: agentRuntimeId,
        input: request,
        config: cfg,
      });
      return (result.items || []).map(
        (item) => new AgentRuntimeEndpoint(item, cfg)
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('AgentRuntime', agentRuntimeId);
      }
      throw error;
    }
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
    const cfg = Config.withConfigs(this.config, config);
    const versions: AgentRuntimeVersion[] = [];
    let page = 1;
    const pageSize = 50;

    while (true) {
      const request = new $AgentRun.ListAgentRuntimeVersionsRequest({
        ...input,
        pageNumber: input?.pageNumber ?? page,
        pageSize: input?.pageSize ?? pageSize,
      });
      const result = await this.controlApi.listAgentRuntimeVersions({
        agentId: agentRuntimeId,
        input: request,
        config: cfg,
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
