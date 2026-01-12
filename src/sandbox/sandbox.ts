/**
 * Base Sandbox Resource
 *
 * 此模块定义基础 Sandbox 资源类。
 * This module defines the base Sandbox resource class.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";
import * as $Util from "@alicloud/tea-util";

import { Config } from "../utils/config";
import { ControlAPI } from "../utils/control-api";
import { ClientError, HTTPError, ServerError } from "../utils/exception";
import { logger } from "../utils/log";
import { updateObjectProperties } from "../utils/resource";

import { SandboxDataAPI } from "./api/sandbox-data";
import {
  SandboxCreateInput,
  SandboxData,
  SandboxListInput,
  SandboxState,
  TemplateType,
} from "./model";

/**
 * Base Sandbox resource class
 * 基础沙箱资源类 / Base Sandbox Resource Class
 */
export class Sandbox implements SandboxData {
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

  protected static getClient(config?: Config): $AgentRun.default {
    const controlApi = new ControlAPI(config);
    return (controlApi as any).getClient(config);
  }

  /**
   * Create a new Sandbox
   * 创建新沙箱 / Create a New Sandbox
   */
  static async create(
    input: SandboxCreateInput,
    config?: Config,
  ): Promise<Sandbox> {
    try {
      const cfg = Config.withConfigs(config);
      
      // Use Data API to create sandbox (async creation)
      const dataApi = new SandboxDataAPI({
        sandboxId: "", // Not needed for creation
        config: cfg,
      });

      const result = await dataApi.createSandbox({
        templateName: input.templateName,
        sandboxIdleTimeoutSeconds: input.sandboxIdleTimeoutSeconds,
        nasConfig: input.nasConfig,
        ossMountConfig: input.ossMountConfig,
        polarFsConfig: input.polarFsConfig,
        config: cfg,
      });

      // Check if creation was successful
      if (result.code !== "SUCCESS") {
        throw new ClientError(
          0,
          `Failed to create sandbox: ${result.message || "Unknown error"}`,
        );
      }

      // Extract data and create Sandbox instance
      const data = result.data || {};
      return Sandbox.fromInnerObject(data as any, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Sandbox", input.templateName);
      }
      Sandbox.handleError(error);
    }
  }

  /**
   * Delete a Sandbox by ID
   */
  static async delete(params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> {
    const { id, config } = params;
    try {
      const cfg = Config.withConfigs(config);
      
      // Use Data API to delete sandbox
      const dataApi = new SandboxDataAPI({
        sandboxId: id,
        config: cfg,
      });

      const result = await dataApi.deleteSandbox({
        sandboxId: id,
        config: cfg,
      });

      // Check if deletion was successful
      if (result.code !== "SUCCESS") {
        throw new ClientError(
          0,
          `Failed to delete sandbox: ${result.message || "Unknown error"}`,
        );
      }

      // Extract data and create Sandbox instance
      const data = result.data || {};
      return Sandbox.fromInnerObject(data as any, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Sandbox", id);
      }
      Sandbox.handleError(error);
    }
  }

  /**
   * Stop a Sandbox by ID
   */
  static async stop(params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> {
    const { id, config } = params;
    try {
      const cfg = Config.withConfigs(config);
      
      // Use Data API to stop sandbox
      const dataApi = new SandboxDataAPI({
        sandboxId: id,
        config: cfg,
      });

      const result = await dataApi.stopSandbox({
        sandboxId: id,
        config: cfg,
      });

      // Check if stop was successful
      if (result.code !== "SUCCESS") {
        throw new ClientError(
          0,
          `Failed to stop sandbox: ${result.message || "Unknown error"}`,
        );
      }

      // Extract data and create Sandbox instance
      const data = result.data || {};
      return Sandbox.fromInnerObject(data as any, config);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Sandbox", id);
      }
      Sandbox.handleError(error);
    }
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
      if (result.code !== "SUCCESS") {
        throw new ClientError(
          0,
          `Failed to get sandbox: ${result.message || "Unknown error"}`,
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
            const { CodeInterpreterSandbox } = await import('./code-interpreter-sandbox');
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
        }
      }
      
      return baseSandbox;
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Sandbox", id);
      }
      Sandbox.handleError(error);
    }
  }

  /**
   * List Sandboxes
   */
  static async list(
    input?: SandboxListInput,
    config?: Config,
  ): Promise<Sandbox[]> {
    try {
      const client = Sandbox.getClient(config);
      const runtime = new $Util.RuntimeOptions({});
      const request = new $AgentRun.ListSandboxesRequest({
        maxResults: input?.maxResults,
        nextToken: input?.nextToken,
        status: input?.status,
        templateName: input?.templateName,
        templateType: input?.templateType,
      });

      const response = await client.listSandboxesWithOptions(
        request,
        {},
        runtime,
      );

      logger.debug(
        `API listSandboxes called, Request ID: ${response.body?.requestId}`,
      );

      return (response.body?.data?.sandboxes || []).map(
        (item: $AgentRun.Sandbox) => Sandbox.fromInnerObject(item, config),
      );
    } catch (error) {
      Sandbox.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  protected static handleError(error: unknown): never {
    if (error && typeof error === "object" && "statusCode" in error) {
      const e = error as {
        statusCode: number;
        message: string;
        data?: { requestId?: string };
      };
      const statusCode = e.statusCode;
      const message = e.message || "Unknown error";
      const requestId = e.data?.requestId;

      if (statusCode >= 400 && statusCode < 500) {
        throw new ClientError(statusCode, message, { requestId });
      } else if (statusCode >= 500) {
        throw new ServerError(statusCode, message, { requestId });
      }
    }
    throw error;
  }

  /**
   * Delete this sandbox
   */
  delete = async (params?: { config?: Config }): Promise<Sandbox> => {
    const config = params?.config;
    if (!this.sandboxId) {
      throw new Error("sandboxId is required to delete a Sandbox");
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
      throw new Error("sandboxId is required to stop a Sandbox");
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
      throw new Error("sandboxId is required to refresh a Sandbox");
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
      if (this.state === SandboxState.RUNNING || this.state === SandboxState.READY) {
        return this;
      }

      if (this.state === SandboxState.FAILED) {
        throw new Error(`Sandbox failed: ${this.stateReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for Sandbox to be running after ${options?.timeoutSeconds ?? 300} seconds`,
    );
  };
}
