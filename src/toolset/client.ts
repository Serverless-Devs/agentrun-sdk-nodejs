/**
 * ToolSet Client
 *
 * ToolSet 客户端，提供 ToolSet 的管理功能。
 * Client for managing ToolSet resources.
 */

import { ListToolsetsRequest } from '@alicloud/devs20230714';
import { Config } from '../utils/config';
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
  protected config?: Config;
  protected controlClient: ToolControlAPI;
  constructor(config?: Config) {
    this.config = config;
    this.controlClient = new ToolControlAPI(config);
  }

  // /**
  //  * Delete a ToolSet by name
  //  */
  // deleteToolSet = async (params: {
  //   name: string;
  //   config?: Config;
  // }): Promise<ToolSet> => {
  //   const { name, config } = params;
  //   return ToolSet.delete({ name, config: config ?? this.config });
  // };

  /**
   * Get a ToolSet by name
   */
  get = async (params: { name: string; config?: Config }): Promise<ToolSet> => {
    const { name, config } = params;
    const cfg = Config.withConfigs(this.config, config);
    const result = await this.controlClient.getToolset({
      name,
      config: cfg,
    });

    return new ToolSet(result);
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
    const results = await this.controlClient.listToolsets({
      input: new ListToolsetsRequest(input),
      config: cfg,
    });

    return results.data?.map((result) => new ToolSet(result)) || [];
  };
}
