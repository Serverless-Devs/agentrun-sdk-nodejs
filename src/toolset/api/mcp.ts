/**
 * MCP Protocol Handler
 * MCP 协议处理
 *
 * Handles tool invocations for MCP (Model Context Protocol).
 * 处理 MCP(Model Context Protocol)协议的工具调用。
 */

import { Config } from '../../utils/config';
import { logger } from '../../utils/log';

/**
 * MCP Session
 *
 * Manages an MCP session connection.
 * 管理 MCP 会话连接。
 */
export class MCPSession {
  private url: string;
  private config: Config;
  private client: any; // Will be typed when @modelcontextprotocol/sdk is installed
  private clientSession: any;

  constructor(url: string, config?: Config) {
    this.url = url;
    this.config = Config.withConfigs(config);
  }

  /**
   * Create and initialize the session
   * 创建并初始化会话
   */
  connect = async (_params?: { config?: Config }): Promise<any> => {
    try {
      // Dynamically import MCP SDK
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');

      // Create SSE transport
      // Note: SSEClientTransport does not support timeout or headers in constructor
      const transport = new SSEClientTransport(new URL(this.url));

      // Create client
      this.client = new Client(
        {
          name: 'agentrun-nodejs-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect
      await this.client.connect(transport);

      return this.client;
    } catch (error) {
      logger.error('Failed to create MCP session:', error);
      throw error;
    }
  };

  /**
   * Close the session
   * 关闭会话
   */
  close = async (_params?: { config?: Config }): Promise<void> => {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.error('Failed to close MCP session:', error);
      }
    }
  };

  /**
   * Get toolsets
   * 获取工具集
   */
  toolsets(config?: Config): MCPToolSet {
    const cfg = Config.withConfigs(this.config, config);
    return new MCPToolSet(this.url + '/toolsets', cfg);
  }
}

/**
 * MCP Tool Set
 *
 * Manages MCP tools and provides invocation capabilities.
 * 管理 MCP 工具并提供调用功能。
 */
export class MCPToolSet {
  private url: string;
  private config: Config;

  constructor(url: string, config?: Config) {
    this.url = url;
    this.config = Config.withConfigs(config);
  }

  /**
   * Create a new session
   * 创建新会话
   */
  newSession(config?: Config): MCPSession {
    const cfg = Config.withConfigs(this.config, config);
    return new MCPSession(this.url, cfg);
  }

  /**
   * List available tools (async)
   * 列出可用工具（异步）
   */
  toolsAsync = async (params?: { config?: Config }): Promise<any[]> => {
    const session = this.newSession(params?.config);
    try {
      const client = await session.connect();
      const result = await client.listTools();
      return result.tools || [];
    } finally {
      await session.close();
    }
  };

  /**
   * List available tools (sync wrapper)
   * 列出可用工具（同步包装）
   *
   * Note: This is a convenience method that wraps the async version.
   * In Node.js, prefer using toolsAsync() directly.
   */
  tools(config?: Config): Promise<any[]> {
    return this.toolsAsync({ config });
  }

  /**
   * Call a tool (async)
   * 调用工具（异步）
   */
  callToolAsync = async (
    name: string,
    args?: Record<string, unknown>,
    config?: Config
  ): Promise<any> => {
    const session = this.newSession(config);
    try {
      const client = await session.connect();
      const result = await client.callTool({
        name,
        arguments: args || {},
      });

      // Convert content to plain objects
      if (result.content && Array.isArray(result.content)) {
        return result.content.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            // If item has a toJSON method, use it
            if (typeof item.toJSON === 'function') {
              return item.toJSON();
            }
            // Otherwise, create a plain object copy
            return { ...item };
          }
          return item;
        });
      }

      return result.content || [];
    } finally {
      await session.close();
    }
  };

  /**
   * Call a tool (sync wrapper)
   * 调用工具（同步包装）
   *
   * Note: This is a convenience method that wraps the async version.
   * In Node.js, prefer using callToolAsync() directly.
   */
  callTool(name: string, args?: Record<string, unknown>, config?: Config): Promise<any> {
    return this.callToolAsync(name, args, config);
  }
}
