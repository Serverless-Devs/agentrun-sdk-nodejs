/**
 * ToolSet Client
 *
 * ToolSet 客户端，提供 ToolSet 的管理功能。
 * Client for managing ToolSet resources.
 */

import { Config } from "../utils/config";

import {
  ToolSetCreateInput,
  ToolSetListInput,
  ToolSetUpdateInput,
} from "./model";
import { ToolSet } from "./toolset";

/**
 * ToolSet Client
 *
 * 提供 ToolSet 的管理功能。
 */
export class ToolSetClient {
  private config?: Config;

  constructor(config?: Config) {
    this.config = config;
  }

  /**
   * Create a ToolSet
   */
  createToolSet = async (params: {
    input: ToolSetCreateInput;
    config?: Config;
  }): Promise<ToolSet> => {
    const { input, config } = params;
    return ToolSet.create({ input, config: config ?? this.config });
  };

  /**
   * Delete a ToolSet by name
   */
  deleteToolSet = async (params: {
    name: string;
    config?: Config;
  }): Promise<ToolSet> => {
    const { name, config } = params;
    return ToolSet.delete({ name, config: config ?? this.config });
  };

  /**
   * Get a ToolSet by name
   */
  getToolSet = async (params: {
    name: string;
    config?: Config;
  }): Promise<ToolSet> => {
    const { name, config } = params;
    return ToolSet.get({ name, config: config ?? this.config });
  };

  /**
   * Update a ToolSet by name
   */
  updateToolSet = async (params: {
    name: string;
    input: ToolSetUpdateInput;
    config?: Config;
  }): Promise<ToolSet> => {
    const { name, input, config } = params;
    return ToolSet.update({ name, input, config: config ?? this.config });
  };

  /**
   * List ToolSets
   */
  listToolSets = async (params?: {
    input?: ToolSetListInput;
    config?: Config;
  }): Promise<ToolSet[]> => {
    const { input, config } = params ?? {};
    return ToolSet.list(input, config ?? this.config);
  };

  /**
   * List all ToolSets with pagination
   */
  listAllToolSets = async (params?: {
    options?: { prefix?: string; labels?: Record<string, string> };
    config?: Config;
  }): Promise<ToolSet[]> => {
    const { options, config } = params ?? {};
    return ToolSet.listAll(options, config ?? this.config);
  };
}
