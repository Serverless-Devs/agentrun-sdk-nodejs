/**
 * Base Sandbox Resource
 *
 * 此模块定义基础 Sandbox 资源类。
 * This module defines the base Sandbox resource class.
 */

import { Config } from '../utils/config';
import { ResourceBase, updateObjectProperties } from '../utils/resource';

import {
  SandboxCreateInput,
  SandboxData,
  SandboxListInput,
  SandboxState,
  TemplateType,
} from './model';

/**
 * Base Sandbox resource class
 * 基础沙箱资源类 / Base Sandbox Resource Class
 */
export class Sandbox extends ResourceBase implements SandboxData {
  templateType?: TemplateType;

  /**
   * 沙箱 ID / Sandbox ID
   */
  sandboxId?: string;
  /**
   * 沙箱名称 / Sandbox Name
   */
  sandboxName?: string;
  /**
   * 模板 ID / Template ID
   */
  templateId?: string;
  /**
   * 模板名称 / Template Name
   */
  templateName?: string;
  /**
   * 沙箱状态 / Sandbox State
   */
  state?: SandboxState;
  /**
   * 状态原因 / State Reason
   */
  stateReason?: string;
  /**
   * 沙箱创建时间 / Sandbox Creation Time
   */
  createdAt?: string;
  /**
   * 最后更新时间 / Last Updated Time
   */
  lastUpdatedAt?: string;
  /**
   * 沙箱空闲超时时间（秒） / Sandbox Idle Timeout (seconds)
   */
  sandboxIdleTimeoutSeconds?: number;
  /**
   * 沙箱结束时间 / Sandbox End Time
   */
  endedAt?: string;
  /**
   * 元数据 / Metadata
   */
  metadata?: Record<string, any>;
  /**
   * 沙箱全局唯一资源名称 / Sandbox ARN
   */
  sandboxArn?: string;
  /**
   * 沙箱空闲 TTL（秒） / Sandbox Idle TTL (seconds)
   */
  sandboxIdleTTLInSeconds?: number;

  protected _config?: Config;

  constructor(data?: Partial<SandboxData>, config?: Config) {
    super();

    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Create sandbox from SDK response object
   * 从 SDK 响应对象创建沙箱 / Create Sandbox from SDK Response Object
   */
  static fromInnerObject(obj: any, config?: Config): Sandbox {
    return new Sandbox(
      {
        sandboxId: obj.sandboxId,
        sandboxName: obj.sandboxName,
        templateId: obj.templateId,
        templateName: obj.templateName,
        // API returns "status" field, map it to "state"
        state: (obj.status || obj.state) as SandboxState,
        stateReason: obj.stateReason,
        createdAt: obj.createdAt,
        lastUpdatedAt: obj.lastUpdatedAt,
        sandboxIdleTimeoutSeconds: obj.sandboxIdleTimeoutSeconds,
        // New fields / 新增字段
        endedAt: obj.endedAt,
        metadata: obj.metadata,
        sandboxArn: obj.sandboxArn,
        sandboxIdleTTLInSeconds: obj.sandboxIdleTTLInSeconds,
      },
      config
    );
  }

  private static getClient() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SandboxClient } = require('./client');
    return new SandboxClient();
  }

  /**
   * Create a new Sandbox
   * 创建新沙箱 / Create a New Sandbox
   */
  static async create(
    input: SandboxCreateInput,
    config?: Config
  ): Promise<Sandbox> {
    return await Sandbox.getClient().createSandbox({ input, config });
  }

  /**
   * Delete a Sandbox by ID
   */
  static async delete(params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> {
    const { id, config } = params;
    return await Sandbox.getClient().deleteSandbox({ id, config });
  }

  /**
   * Stop a Sandbox by ID
   */
  static async stop(params: { id: string; config?: Config }): Promise<Sandbox> {
    const { id, config } = params;
    return await Sandbox.getClient().stopSandbox({ id, config });
  }

  /**
   * Get a Sandbox by ID
   */
  static async get(params: {
    id: string;
    templateType?: TemplateType;
    config?: Config;
  }): Promise<Sandbox> {
    const { id, templateType, config } = params;
    try {
      const cfg = Config.withConfigs(config);

      // Use Data API to get sandbox
      const dataApi = new SandboxDataAPI({
        sandboxId: id,
        config: cfg,
      });

      const result = await dataApi.getSandbox({
        sandboxId: id,
        config: cfg,
      });

      // Check if get was successful
      if (result.code !== 'SUCCESS') {
        throw new ClientError(
          0,
          `Failed to get sandbox: ${result.message || 'Unknown error'}`
        );
      }

      // Extract data and create Sandbox instance
      const data = result.data || {};
      const baseSandbox = Sandbox.fromInnerObject(data as any, config);

      // If templateType is specified, return the appropriate subclass
      if (templateType) {
        // Dynamically import to avoid circular dependencies
        switch (templateType) {
          case TemplateType.CODE_INTERPRETER: {
            const { CodeInterpreterSandbox } =
              await import('./code-interpreter-sandbox');
            // Pass baseSandbox instead of raw data
            const sandbox = new CodeInterpreterSandbox(baseSandbox, config);
            return sandbox;
          }
          case TemplateType.BROWSER: {
            const { BrowserSandbox } = await import('./browser-sandbox');
            // Pass baseSandbox instead of raw data
            const sandbox = new BrowserSandbox(baseSandbox, config);
            return sandbox;
          }
          case TemplateType.AIO: {
            const { AioSandbox } = await import('./aio-sandbox');
            // Pass baseSandbox instead of raw data
            const sandbox = new AioSandbox(baseSandbox, config);
            return sandbox;
          }
          case TemplateType.CUSTOM: {
            const { CustomSandbox } = await import('./custom-sandbox');
            // Pass baseSandbox instead of raw data
            const sandbox = new CustomSandbox(baseSandbox, config);
            return sandbox;
          }
        }
      }

      return baseSandbox;
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Sandbox', id);
      }
      Sandbox.handleError(error);
    }
  }

  /**
   * List Sandboxes
   */
  static async list(
    input?: SandboxListInput,
    config?: Config
  ): Promise<Sandbox[]> {
    return await Sandbox.getClient().listSandboxes({ input, config });
  }

  get = async (params?: { config?: Config }) => {
    const { config } = params ?? {};

    return await Sandbox.get({
      id: this.sandboxId!,
      templateType: this.templateType,
      config: Config.withConfigs(this._config, config),
    });
  };

  /**
   * Delete this sandbox
   */
  delete = async (params?: { config?: Config }): Promise<Sandbox> => {
    const config = params?.config;
    if (!this.sandboxId) {
      throw new Error('sandboxId is required to delete a Sandbox');
    }

    const result = await Sandbox.delete({
      id: this.sandboxId,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Stop this sandbox
   */
  stop = async (params?: { config?: Config }): Promise<Sandbox> => {
    const config = params?.config;
    if (!this.sandboxId) {
      throw new Error('sandboxId is required to stop a Sandbox');
    }

    const result = await Sandbox.stop({
      id: this.sandboxId,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this sandbox's data
   */
  refresh = async (params?: { config?: Config }): Promise<Sandbox> => {
    const config = params?.config;
    if (!this.sandboxId) {
      throw new Error('sandboxId is required to refresh a Sandbox');
    }

    const result = await Sandbox.get({
      id: this.sandboxId,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Wait until the sandbox is running
   */
  waitUntilRunning = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (sandbox: Sandbox) => void;
    },
    config?: Config
  ): Promise<Sandbox> => {
    const timeout = (options?.timeoutSeconds ?? 300) * 1000;
    const interval = (options?.intervalSeconds ?? 5) * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.refresh({ config });

      if (options?.beforeCheck) {
        options.beforeCheck(this);
      }

      // API返回READY状态表示沙箱就绪可以运行
      // API returns READY status to indicate the sandbox is ready to run
      if (
        this.state === SandboxState.RUNNING ||
        this.state === SandboxState.READY
      ) {
        return this;
      }

      if (this.state === SandboxState.FAILED) {
        throw new Error(`Sandbox failed: ${this.stateReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for Sandbox to be running after ${
        options?.timeoutSeconds ?? 300
      } seconds`
    );
  };
}
