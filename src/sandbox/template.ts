/**
 * Template Resource
 *
 * 此模块定义 Template 资源类。
 * This module defines the Template resource class.
 */

import { Config } from '../utils/config';
import { Status } from '../utils/model';
import {
  listAllResourcesFunction,
  ResourceBase,
  updateObjectProperties,
} from '../utils/resource';

import {
  TemplateCreateInput,
  TemplateData,
  TemplateListInput,
  TemplateType,
  TemplateUpdateInput,
} from './model';

/**
 * Template resource class
 * 模板资源类 / Template Resource Class
 */
export class Template extends ResourceBase implements TemplateData {
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
  declare status?: Status;
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

  protected _config?: Config;

  constructor(data?: any, config?: Config) {
    super();

    if (data) {
      updateObjectProperties(this, data);
      this.normalizeNumericFields();
    }

    this._config = config;
  }

  uniqIdCallback = () => this.templateId;

  private static getClient() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SandboxClient } = require('./client');
    return new SandboxClient();
  }

  /**
   * Create a new Template
   */
  static async create(params: {
    input: TemplateCreateInput;
    config?: Config;
  }): Promise<Template> {
    return await Template.getClient().createTemplate(params);
  }

  /**
   * Delete a Template by name
   */
  static async delete(params: {
    name: string;
    config?: Config;
  }): Promise<Template> {
    return await Template.getClient().deleteTemplate(params);
  }

  /**
   * Update a Template by name
   */
  static async update(params: {
    name: string;
    input: TemplateUpdateInput;
    config?: Config;
  }): Promise<Template> {
    return await Template.getClient().updateTemplate(params);
  }

  /**
   * Get a Template by name
   */
  static async get(params: {
    name: string;
    config?: Config;
  }): Promise<Template> {
    return await Template.getClient().getTemplate(params);
  }

  /**
   * List Templates
   */
  static async list(params?: {
    input?: TemplateListInput;
    config?: Config;
  }): Promise<Template[]> {
    return await Template.getClient().listTemplates(params);
  }

  /**
   * List all Templates (with pagination)
   */
  static listAll = listAllResourcesFunction(this.list);

  get = async (params: { config?: Config } = {}): Promise<Template> => {
    return await Template.get({
      name: this.templateName!,
      config: params.config,
    });
  };

  /**
   * Delete this template
   */
  delete = async (params?: { config?: Config }): Promise<Template> => {
    const config = params?.config;
    if (!this.templateName) {
      throw new Error('templateName is required to delete a Template');
    }

    const result = await Template.delete({
      name: this.templateName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    this.normalizeNumericFields();
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
      throw new Error('templateName is required to update a Template');
    }

    const result = await Template.update({
      name: this.templateName,
      input,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    this.normalizeNumericFields();
    return this;
  };

  /**
   * Refresh this template's data
   */
  refresh = async (params?: { config?: Config }): Promise<Template> => {
    const config = params?.config;
    if (!this.templateName) {
      throw new Error('templateName is required to refresh a Template');
    }

    const result = await Template.get({
      name: this.templateName,
      config: config ?? this._config,
    });
    updateObjectProperties(this, result);
    this.normalizeNumericFields();
    return this;
  };

  private normalizeNumericFields() {
    const toNumber = (value?: string | number) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    this.sandboxIdleTimeoutInSeconds = toNumber(
      this.sandboxIdleTimeoutInSeconds,
    );
    this.sandboxTtlInSeconds = toNumber(this.sandboxTtlInSeconds);
    this.shareConcurrencyLimitPerSandbox = toNumber(
      this.shareConcurrencyLimitPerSandbox,
    );
    this.cpu = toNumber(this.cpu);
    this.memory = toNumber(this.memory);
    this.diskSize = toNumber(this.diskSize);
  }
}
