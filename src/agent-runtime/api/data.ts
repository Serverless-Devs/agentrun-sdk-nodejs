/**
 * Agent Runtime Data API
 *
 * 此模块定义 Agent Runtime 的数据 API，用于调用 Agent Runtime 实例。
 * This module defines the Data API for Agent Runtime, used to invoke Agent Runtime instances.
 */

import type { ChatCompletionMessageParam } from 'openai/resources';
import { Config } from '../../utils/config';
import { DataAPI, ResourceType } from '../../utils/data-api';

/**
 * Invoke arguments for OpenAI-compatible API
 */
export interface InvokeArgs {
  /** Chat messages */
  messages: ChatCompletionMessageParam[];
  /** Whether to stream the response */
  stream?: boolean;
  /** Optional config override */
  config?: Config;
}

/**
 * Agent Runtime Data API for invoking agent runtime through OpenAI-compatible API
 */
export class AgentRuntimeDataAPI extends DataAPI {
  constructor(
    agentRuntimeName: string,
    agentRuntimeEndpointName: string = 'Default',
    config?: Config
  ) {
    super(
      agentRuntimeName,
      ResourceType.Runtime,
      config,
      `agent-runtimes/${agentRuntimeName}/endpoints/${agentRuntimeEndpointName}/invocations`
    );
  }

  /**
   * Invoke agent runtime using OpenAI-compatible API
   */
  async invokeOpenai(args: InvokeArgs) {
    const { messages, stream = false, config } = args;

    // Merge configs
    const cfg = Config.withConfigs(this.getConfig(), config);
    const apiBase = this.withPath('openai/v1');

    // Get authenticated headers
    const [, headers] = await this.getAuthHeaders(apiBase, {}, cfg);

    // Use dynamic import to avoid bundling OpenAI SDK if not used
    const { default: OpenAI } = await import('openai');

    // Create OpenAI client with custom base URL and auth headers
    const client = new OpenAI({
      apiKey: '', // Empty API key, we use custom headers for auth
      baseURL: apiBase,
      defaultHeaders: headers,
      timeout: cfg.timeout,
    });

    return client.chat.completions.create({
      model: this.getResourceName(),
      messages,
      stream,
    });
  }

  // Expose protected methods for use in this subclass
  private getConfig(): Config {
    return (this as any).config;
  }

  private getResourceName(): string {
    return (this as any).resourceName;
  }

  private async getAuthHeaders(
    url: string,
    headers: Record<string, string>,
    config?: Config
  ): Promise<[string, Record<string, string>]> {
    const [authUrl, authHeaders] = await (this as any).auth(url, headers, undefined, config);
    return [authUrl, authHeaders];
  }
}
