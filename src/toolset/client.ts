/**
 * ToolSet Client
 *
 * ToolSet 客户端，提供 ToolSet 的管理功能。
 * Client for managing ToolSet resources.
 */

import {
  APIKeyAuthParameter,
  Authorization,
  AuthorizationParameters,
  ListToolsetsRequest,
  Toolset,
  ToolsetSchema,
  ToolsetSpec,
} from '@alicloud/devs20230714';
import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';
import { ToolControlAPI } from './api';

import {
  ToolSetCreateInput,
  ToolSetListInput,
  ToolSetUpdateInput,
} from './model';
import { ToolSet } from './toolset';

/**
 * ToolSet Client
 *
 * 提供 ToolSet 的管理功能。
 */
export class ToolSetClient {
  private config?: Config;
  private controlApi: ToolControlAPI;
  constructor(config?: Config) {
    this.config = config;
    this.controlApi = new ToolControlAPI(config);
  }

  /**
   * Create a ToolSet
   */
  create = async (params: {
    input: ToolSetCreateInput;
    config?: Config;
  }): Promise<ToolSet> => {
    const { input, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const authConfig = input.spec?.authConfig
        ? new Authorization({
            type: input.spec.authConfig.type,
            parameters: new AuthorizationParameters({
              apiKeyParameter: new APIKeyAuthParameter({
                key: input.spec.authConfig.apiKeyHeaderName,
                value: input.spec.authConfig.apiKeyValue,
                in: 'header',
              }),
            }),
          })
        : undefined;

      const request = new Toolset({
        ...input,
        spec: input.spec
          ? new ToolsetSpec({
              ...input.spec,
              schema: input.spec.schema
                ? new ToolsetSchema({
                    ...input.spec.schema,
                  })
                : undefined,
              authConfig,
            })
          : undefined,
      });
      const result = await this.controlApi.createToolset({
        input: request,
        config: cfg,
      });

      return new ToolSet(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('ToolSet', input.name);
      }
      throw error;
    }
  };

  /**
   * Delete a ToolSet by name
   */
  delete = async (params: {
    name: string;
    config?: Config;
  }): Promise<ToolSet> => {
    const { name, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.deleteToolset({
        name,
        config: cfg,
      });

      return new ToolSet(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('ToolSet', name);
      }
      throw error;
    }
  };

  /**
   * Update a ToolSet by name
   */
  update = async (params: {
    name: string;
    input: ToolSetUpdateInput;
    config?: Config;
  }): Promise<ToolSet> => {
    const { name, input, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const authConfig = input.spec?.authConfig
        ? new Authorization({
            type: input.spec.authConfig.type,
            parameters: new AuthorizationParameters({
              apiKeyParameter: new APIKeyAuthParameter({
                key: input.spec.authConfig.apiKeyHeaderName,
                value: input.spec.authConfig.apiKeyValue,
                in: 'header',
              }),
            }),
          })
        : undefined;

      const request = new Toolset({
        name,
        ...input,
        spec: input.spec
          ? new ToolsetSpec({
              ...input.spec,
              schema: input.spec.schema
                ? new ToolsetSchema({
                    ...input.spec.schema,
                  })
                : undefined,
              authConfig,
            })
          : undefined,
      });

      const result = await this.controlApi.updateToolset({
        name,
        input: request,
        config: cfg,
      });

      return new ToolSet(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('ToolSet', name);
      }
      throw error;
    }
  };

  /**
   * Get a ToolSet by name
   */
  get = async (params: { name: string; config?: Config }): Promise<ToolSet> => {
    const { name, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.getToolset({
        name,
        config: cfg,
      });

      return new ToolSet(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('ToolSet', name);
      }
      throw error;
    }
  };

  /**
   * List ToolSets
   */
  list = async (params?: {
    input?: ToolSetListInput;
    config?: Config;
  }): Promise<ToolSet[]> => {
    const { input, config } = params ?? {};
    const cfg = Config.withConfigs(this.config, config);

    const results = await this.controlApi.listToolsets({
      input: new ListToolsetsRequest({ ...input }),
      config: cfg,
    });

    return results.data?.map((result) => new ToolSet(result, cfg)) || [];
  };
}
