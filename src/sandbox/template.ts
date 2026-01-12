/**
 * Template Resource
 *
 * 此模块定义 Template 资源类。
 * This module defines the Template resource class.
 */

import * as $AgentRun from "@alicloud/agentrun20250910";
import * as $Util from "@alicloud/tea-util";

import { Config } from "../utils/config";
import { ControlAPI } from "../utils/control-api";
import { ClientError, HTTPError, ServerError } from "../utils/exception";
import { logger } from "../utils/log";
import { Status } from "../utils/model";
import { updateObjectProperties } from "../utils/resource";

import {
  TemplateCreateInput,
  TemplateData,
  TemplateListInput,
  TemplateNetworkMode,
  TemplateType,
  TemplateUpdateInput,
} from "./model";

/**
 * Template resource class
 * 模板资源类 / Template Resource Class
 */
export class Template implements TemplateData {
  /**
   * 模板 ARN / Template ARN
   */
  templateArn?: string;
  /**
   * 模板 ID / Template ID
   */
  templateId?: string;
  /**
   * 模板名称 / Template Name
   */
  templateName?: string;
  /**
   * 模板类型 / Template Type
   */
  templateType?: TemplateType;
  /**
   * CPU 核数 / CPU Cores
   */
  cpu?: number;
  /**
   * 内存大小（MB） / Memory Size (MB)
   */
  memory?: number;
  /**
   * 创建时间 / Creation Time
   */
  createdAt?: string;
  /**
   * 描述 / Description
   */
  description?: string;
  /**
   * 执行角色 ARN / Execution Role ARN
   */
  executionRoleArn?: string;
  /**
   * 最后更新时间 / Last Updated Time
   */
  lastUpdatedAt?: string;
  /**
   * 资源名称 / Resource Name
   */
  resourceName?: string;
  /**
   * 沙箱空闲超时时间（秒） / Sandbox Idle Timeout (seconds)
   */
  sandboxIdleTimeoutInSeconds?: number;
  /**
   * 沙箱存活时间（秒） / Sandbox TTL (seconds)
   */
  sandboxTtlInSeconds?: number;
  /**
   * 每个沙箱的最大并发会话数 / Max Concurrency Limit Per Sandbox
   */
  shareConcurrencyLimitPerSandbox?: number;
  /**
   * 状态 / Status
   */
  status?: Status;
  /**
   * 状态原因 / Status Reason
   */
  statusReason?: string;
  /**
   * 磁盘大小（GB） / Disk Size (GB)
   */
  diskSize?: number;
  /**
   * 是否允许匿名管理 / Whether to allow anonymous management
   */
  allowAnonymousManage?: boolean;

  private _config?: Config;

  constructor(data?: Partial<TemplateData>, config?: Config) {
    if (data) {
      updateObjectProperties(this, data);
    }
    this._config = config;
  }

  /**
   * Create template from SDK response object
   * 从 SDK 响应对象创建模板 / Create Template from SDK Response Object
   */
  static fromInnerObject(obj: $AgentRun.Template, config?: Config): Template {
    return new Template(
      {
        templateArn: obj.templateArn,
        templateId: obj.templateId,
        templateName: obj.templateName,
        templateType: obj.templateType as TemplateType,
        cpu: obj.cpu,
        memory: obj.memory,
        createdAt: obj.createdAt,
        description: obj.description,
        executionRoleArn: obj.executionRoleArn,
        lastUpdatedAt: obj.lastUpdatedAt,
        resourceName: obj.resourceName,
        sandboxIdleTimeoutInSeconds: obj.sandboxIdleTimeoutInSeconds
          ? parseInt(obj.sandboxIdleTimeoutInSeconds, 10)
          : undefined,
        sandboxTtlInSeconds: obj.sandboxTTLInSeconds
          ? parseInt(obj.sandboxTTLInSeconds, 10)
          : undefined,
        status: obj.status as Status,
        statusReason: obj.statusReason,
        diskSize: obj.diskSize,
        // New field / 新增字段
        allowAnonymousManage: obj.allowAnonymousManage,
      },
      config,
    );
  }

  private static getClient(config?: Config): $AgentRun.default {
    const controlApi = new ControlAPI(config);
    return controlApi.getClient();
  }

  /**
   * Create a new Template
   */
  static async create(params: {
    input: TemplateCreateInput;
    config?: Config;
  }): Promise<Template> {
    const { input, config } = params;
    // Set default values based on template type
    const defaults = Template.getDefaults(input.templateType);
    const finalInput = { ...defaults, ...input };

    // Set default network configuration
    if (!finalInput.networkConfiguration) {
      finalInput.networkConfiguration = {
        networkMode: TemplateNetworkMode.PUBLIC,
      };
    }

    // Validation
    Template.validate(finalInput);

    try {
      const client = Template.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      const request = new $AgentRun.CreateTemplateRequest({
        body: new $AgentRun.CreateTemplateInput({
          templateName: finalInput.templateName,
          templateType: finalInput.templateType,
          cpu: finalInput.cpu,
          memory: finalInput.memory,
          executionRoleArn: finalInput.executionRoleArn,
          sandboxIdleTimeoutInSeconds: finalInput.sandboxIdleTimeoutInSeconds,
          description: finalInput.description,
          environmentVariables: finalInput.environmentVariables,
          diskSize: finalInput.diskSize,
          networkConfiguration: finalInput.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                networkMode: finalInput.networkConfiguration.networkMode,
              })
            : undefined,
          // New field / 新增字段
          allowAnonymousManage: finalInput.allowAnonymousManage,
        }),
      });

      const response = await client.createTemplateWithOptions(
        request,
        {},
        runtime,
      );

      logger.debug(
        `API createTemplate called, Request ID: ${response.body?.requestId}`,
      );

      return Template.fromInnerObject(
        response.body?.data as $AgentRun.Template,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Template", input.templateName);
      }
      Template.handleError(error);
    }
  }

  /**
   * Get defaults based on template type
   */
  private static getDefaults(
    templateType: TemplateType,
  ): Partial<TemplateCreateInput> {
    const base = {
      cpu: 2,
      memory: 4096,
      sandboxIdleTimeoutInSeconds: 1800,
      sandboxTtlInSeconds: 21600,
      shareConcurrencyLimitPerSandbox: 200,
    };

    switch (templateType) {
      case TemplateType.CODE_INTERPRETER:
        return { ...base, diskSize: 512 };
      case TemplateType.BROWSER:
      case TemplateType.AIO:
        return { ...base, cpu: 4, memory: 8192, diskSize: 10240 };
      default:
        return { ...base, diskSize: 512 };
    }
  }

  /**
   * Validate template configuration
   */
  private static validate(input: TemplateCreateInput): void {
    // Browser and AIO require specific disk size
    if (
      (input.templateType === TemplateType.BROWSER ||
        input.templateType === TemplateType.AIO) &&
      input.diskSize !== 10240
    ) {
      throw new Error(
        `When templateType is BROWSER or AIO, diskSize must be 10240, got ${input.diskSize}`,
      );
    }

    // CODE_INTERPRETER and AIO cannot use PRIVATE network mode
    if (
      (input.templateType === TemplateType.CODE_INTERPRETER ||
        input.templateType === TemplateType.AIO) &&
      input.networkConfiguration?.networkMode === TemplateNetworkMode.PRIVATE
    ) {
      throw new Error(
        `When templateType is CODE_INTERPRETER or AIO, networkMode cannot be PRIVATE`,
      );
    }
  }

  /**
   * Delete a Template by name
   */
  static async delete(params: {
    name: string;
    config?: Config;
  }): Promise<Template> {
    const { name, config } = params;
    try {
      const client = Template.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      const response = await client.deleteTemplateWithOptions(
        name,
        {},
        runtime,
      );

      logger.debug(
        `API deleteTemplate called, Request ID: ${response.body?.requestId}`,
      );

      return Template.fromInnerObject(
        response.body?.data as $AgentRun.Template,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Template", name);
      }
      Template.handleError(error);
    }
  }

  /**
   * Update a Template by name
   */
  static async update(params: {
    name: string;
    input: TemplateUpdateInput;
    config?: Config;
  }): Promise<Template> {
    const { name, input, config } = params;
    try {
      const client = Template.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      const request = new $AgentRun.UpdateTemplateRequest({
        templateName: name,
        body: new $AgentRun.UpdateTemplateInput({
          cpu: input.cpu,
          memory: input.memory,
          executionRoleArn: input.executionRoleArn,
          sandboxIdleTimeoutInSeconds: input.sandboxIdleTimeoutInSeconds,
          description: input.description,
          environmentVariables: input.environmentVariables,
          diskSize: input.diskSize,
          networkConfiguration: input.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                networkMode: input.networkConfiguration.networkMode,
              })
            : undefined,
        }),
      });

      const response = await client.updateTemplateWithOptions(
        name,
        request,
        {},
        runtime,
      );

      logger.debug(
        `API updateTemplate called, Request ID: ${response.body?.requestId}`,
      );

      return Template.fromInnerObject(
        response.body?.data as $AgentRun.Template,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Template", name);
      }
      Template.handleError(error);
    }
  }

  /**
   * Get a Template by name
   */
  static async get(params: {
    name: string;
    config?: Config;
  }): Promise<Template> {
    const { name, config } = params;
    try {
      const client = Template.getClient(config);
      const runtime = new $Util.RuntimeOptions({});

      const response = await client.getTemplateWithOptions(name, {}, runtime);

      logger.debug(
        `API getTemplate called, Request ID: ${response.body?.requestId}`,
      );

      return Template.fromInnerObject(
        response.body?.data as $AgentRun.Template,
        config,
      );
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError("Template", name);
      }
      Template.handleError(error);
    }
  }

  /**
   * List Templates
   */
  static async list(
    input?: TemplateListInput,
    config?: Config,
  ): Promise<Template[]> {
    try {
      const client = Template.getClient(config);
      const runtime = new $Util.RuntimeOptions({});
      const request = new $AgentRun.ListTemplatesRequest({
        pageNumber: input?.pageNumber,
        pageSize: input?.pageSize,
        templateType: input?.templateType,
      });

      const response = await client.listTemplatesWithOptions(
        request,
        {},
        runtime,
      );

      logger.debug(
        `API listTemplates called, Request ID: ${response.body?.requestId}`,
      );

      return (response.body?.data?.items || []).map((item) =>
        Template.fromInnerObject(item, config),
      );
    } catch (error) {
      Template.handleError(error);
    }
  }

  /**
   * List all Templates (with pagination)
   */
  static async listAll(
    options?: { templateType?: TemplateType },
    config?: Config,
  ): Promise<Template[]> {
    const templates: Template[] = [];
    let page = 1;
    const pageSize = 50;

    while (true) {
      const result = await Template.list(
        {
          pageNumber: page,
          pageSize,
          templateType: options?.templateType,
        },
        config,
      );

      templates.push(...result);
      page++;

      if (result.length < pageSize) {
        break;
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return templates.filter((t) => {
      if (!t.templateId || seen.has(t.templateId)) {
        return false;
      }
      seen.add(t.templateId);
      return true;
    });
  }

  /**
   * Handle API errors
   */
  private static handleError(error: unknown): never {
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
   * Delete this template
   */
  delete = async (params?: { config?: Config }): Promise<Template> => {
    const config = params?.config;
    if (!this.templateName) {
      throw new Error("templateName is required to delete a Template");
    }

    const result = await Template.delete({
      name: this.templateName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Update this template
   */
  update = async (params: {
    input: TemplateUpdateInput;
    config?: Config;
  }): Promise<Template> => {
    const { input, config } = params;
    if (!this.templateName) {
      throw new Error("templateName is required to update a Template");
    }

    const result = await Template.update({
      name: this.templateName,
      input,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Refresh this template's data
   */
  refresh = async (params?: { config?: Config }): Promise<Template> => {
    const config = params?.config;
    if (!this.templateName) {
      throw new Error("templateName is required to refresh a Template");
    }

    const result = await Template.get({
      name: this.templateName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    return this;
  };

  /**
   * Wait until the template is ready
   */
  waitUntilReady = async (
    options?: {
      timeoutSeconds?: number;
      intervalSeconds?: number;
      beforeCheck?: (template: Template) => void;
    },
    config?: Config,
  ): Promise<Template> => {
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

      if (this.status === Status.CREATE_FAILED) {
        throw new Error(`Template failed: ${this.statusReason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Timeout waiting for Template to be ready after ${options?.timeoutSeconds ?? 300} seconds`,
    );
  };
}
