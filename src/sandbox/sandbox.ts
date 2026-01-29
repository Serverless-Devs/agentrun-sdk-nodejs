/**
 * Base Sandbox Resource
 *
 * 此模块定义基础 Sandbox 资源类。
 * This module defines the base Sandbox resource class.
 */

import { ClientError, HTTPError } from '@/utils';
import { logger } from '../utils/log';
import { Config } from '../utils/config';
import { ResourceBase, updateObjectProperties } from '../utils/resource';

import {
  SandboxCreateInput,
  SandboxData,
  SandboxListInput,
  SandboxState,
  TemplateType,
} from './model';
import { SandboxDataAPI } from './api/sandbox-data';
import type { AioSandbox } from './aio-sandbox';
import type { BrowserSandbox } from './browser-sandbox';
import type { CodeInterpreterSandbox } from './code-interpreter-sandbox';
import type { CustomSandbox } from './custom-sandbox';
import type { SandboxClient } from './client';

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
      config,
    );
  }

  private static getClient(): SandboxClient {
    // lazy-require to avoid circular runtime import between sandbox <-> client
    // keep this dynamic require so module initialization order doesn't break
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SandboxClient } = require('./client') as { SandboxClient: new () => SandboxClient };
    return new SandboxClient();
  }

  /**
   * Create a new Sandbox
   * 创建新沙箱 / Create a New Sandbox
   */
  static async create(params: {
    input: SandboxCreateInput;
    templateType: TemplateType.AIO;
    config?: Config;
  }): Promise<AioSandbox>;
  static async create(params: {
    input: SandboxCreateInput;
    templateType: TemplateType.BROWSER;
    config?: Config;
  }): Promise<BrowserSandbox>;
  static async create(params: {
    input: SandboxCreateInput;
    templateType: TemplateType.CODE_INTERPRETER;
    config?: Config;
  }): Promise<CodeInterpreterSandbox>;
  static async create(params: {
    input: SandboxCreateInput;
    templateType: TemplateType.CUSTOM;
    config?: Config;
  }): Promise<CustomSandbox>;
  static async create(params: {
    input: SandboxCreateInput;
    templateType?: TemplateType;
    config?: Config;
  }): Promise<Sandbox>;
  /** @deprecated Use create({ input, config }) instead. */
  static async create(
    input: SandboxCreateInput,
    config?: Config,
  ): Promise<Sandbox>;

  static async create(
    arg1:
      | {
          input: SandboxCreateInput;
          templateType?: TemplateType;
          config?: Config;
        }
      | SandboxCreateInput,
    arg2?: Config,
  ): Promise<Sandbox> {
    if (typeof arg1 === 'object' && arg1 !== null && 'input' in arg1) {
      // New API: create({ input, templateType?, config? })
      return await Sandbox.getClient().createSandbox(arg1);
    }
    // Legacy API: create(input, config?)
    logger.warn(
      'Deprecated: Sandbox.create(input, config) is deprecated. Use Sandbox.create({ input, config }) instead.',
    );
    return await Sandbox.getClient().createSandbox(arg1 as SandboxCreateInput, arg2);
  }

  /**
   * Delete a Sandbox by ID
   */
  static async delete(params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox>;
  /** @deprecated Use delete({ id, config }) instead. */
  static async delete(id: string, config?: Config): Promise<Sandbox>;
  static async delete(
    arg1: { id: string; config?: Config } | string,
    arg2?: Config,
  ): Promise<Sandbox> {
    if (typeof arg1 === 'string') {
      // Legacy API: delete(id, config?)
      logger.warn(
        'Sandbox.delete(id, config) is deprecated. Use Sandbox.delete({ id, config }) instead.',
      );
      return await Sandbox.getClient().deleteSandbox(arg1, arg2);
    }
    // New API: delete({ id, config })
    return await Sandbox.getClient().deleteSandbox(arg1);
  }

  /**
   * Stop a Sandbox by ID
   */
  static async stop(params: { id: string; config?: Config }): Promise<Sandbox>;
  /** @deprecated Use stop({ id, config }) instead. */
  static async stop(id: string, config?: Config): Promise<Sandbox>;
  static async stop(
    arg1: { id: string; config?: Config } | string,
    arg2?: Config,
  ): Promise<Sandbox> {
    if (typeof arg1 === 'string') {
      // Legacy API: stop(id, config?)
      logger.warn(
        'Sandbox.stop(id, config) is deprecated. Use Sandbox.stop({ id, config }) instead.',
      );
      return await Sandbox.getClient().stopSandbox(arg1, arg2);
    }
    // New API: stop({ id, config })
    return await Sandbox.getClient().stopSandbox(arg1);
  }

  /**
   * Get a Sandbox by ID
   */
  static async get(params: {
    id: string;
    templateType?: TemplateType;
    config?: Config;
  }): Promise<Sandbox>;
  /** @deprecated Use get({ id, templateType, config }) instead. */
  static async get(
    id: string,
    templateType?: TemplateType,
    config?: Config,
  ): Promise<Sandbox>;
  static async get(
    arg1: { id: string; templateType?: TemplateType; config?: Config } | string,
    arg2?: TemplateType | Config,
    arg3?: Config,
  ): Promise<Sandbox> {
    let id: string;
    let templateType: TemplateType | undefined;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: Sandbox.get(id, templateType?, config?) is deprecated. Use Sandbox.get({ id, templateType, config }) instead.',
      );
      id = arg1;
      if (arg2 && typeof arg2 === 'string') {
        templateType = arg2 as TemplateType;
        config = arg3;
      } else {
        config = arg2 as Config;
      }
    } else {
      id = arg1.id;
      templateType = arg1.templateType;
      config = arg1.config;
    }

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
          `Failed to get sandbox: ${result.message || 'Unknown error'}`,
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
      throw error;
    }
  }

  /**
   * List Sandboxes
   */
  static async list(params?: {
    input?: SandboxListInput;
    config?: Config;
  }): Promise<Sandbox[]>;
  /** @deprecated Use list({ input, config }) instead. */
  static async list(
    input: SandboxListInput,
    config?: Config,
  ): Promise<Sandbox[]>;
  static async list(
    arg1?: SandboxListInput | { input?: SandboxListInput; config?: Config },
    arg2?: Config,
  ): Promise<Sandbox[]> {
    // Check if using legacy API (arg1 is input object with list params)
    if (
      arg2 !== undefined ||
      (arg1 &&
        ('maxResults' in arg1 ||
          'nextToken' in arg1 ||
          'status' in arg1 ||
          'templateName' in arg1 ||
          'templateType' in arg1))
    ) {
      // Legacy API: list(input, config?)
      logger.warn(
        'Deprecated: Sandbox.list(input, config) is deprecated. Use Sandbox.list({ input, config }) instead.',
      );
      return await Sandbox.getClient().listSandboxes(
        arg1 as SandboxListInput,
        arg2,
      );
    }
    // New API: list({ input, config }) or list()
    return await Sandbox.getClient().listSandboxes(
      arg1 as { input?: SandboxListInput; config?: Config },
    );
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
    config?: Config,
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
      } seconds`,
    );
  };
}
