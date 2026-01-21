/**
 * Sandbox Client
 *
 * 此模块提供 Sandbox 的客户端 API。
 * This module provides the client API for Sandbox.
 */

import * as $AgentRun from '@alicloud/agentrun20250910';
import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';
import { SandboxControlAPI } from './api/control';

import { BrowserSandbox } from './browser-sandbox';
import { CodeInterpreterSandbox } from './code-interpreter-sandbox';
import {
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  SandboxCreateInput,
  SandboxListInput,
  TemplateCreateInput,
  TemplateListInput,
  TemplateNetworkMode,
  TemplateType,
  TemplateUpdateInput,
} from './model';
import { Sandbox } from './sandbox';
import { Template } from './template';

/**
 * Sandbox Client
 *
 * 提供 Sandbox 和 Template 的管理功能。
 */
export class SandboxClient {
  private config?: Config;
  private controlApi: SandboxControlAPI;

  constructor(config?: Config) {
    this.config = config;
    this.controlApi = new SandboxControlAPI(config);
  }

  // ============ Template Operations ============

  /**
   * Create a Template
   */
  createTemplate = async (params: {
    input: TemplateCreateInput;
    config?: Config;
  }): Promise<Template> => {
    const { input, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const finalInput = this.prepareTemplateCreateInput(input);

      const result = await this.controlApi.createTemplate({
        input: new $AgentRun.CreateTemplateInput({
          ...finalInput,
          networkConfiguration: finalInput.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                ...finalInput.networkConfiguration,
              })
            : undefined,
        }),
        config: cfg,
      });

      return new Template(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Template', input.templateName);
      }
      throw error;
    }
  };

  /**
   * Delete a Template
   */
  deleteTemplate = async (params: {
    name: string;
    config?: Config;
  }): Promise<Template> => {
    const { name, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.deleteTemplate({
        templateName: name,
        config: cfg,
      });
      return new Template(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Template', name);
      }
      throw error;
    }
  };

  /**
   * Update a Template
   */
  updateTemplate = async (params: {
    name: string;
    input: TemplateUpdateInput;
    config?: Config;
  }): Promise<Template> => {
    const { name, input, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.updateTemplate({
        templateName: name,
        input: new $AgentRun.UpdateTemplateInput({
          ...input,
          networkConfiguration: input.networkConfiguration
            ? new $AgentRun.NetworkConfiguration({
                ...input.networkConfiguration,
              })
            : undefined,
        }),
        config: cfg,
      });
      return new Template(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Template', name);
      }
      throw error;
    }
  };

  /**
   * Get a Template
   */
  getTemplate = async (params: {
    name: string;
    config?: Config;
  }): Promise<Template> => {
    const { name, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.getTemplate({
        templateName: name,
        config: cfg,
      });
      return new Template(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Template', name);
      }
      throw error;
    }
  };

  /**
   * List Templates
   */
  listTemplates = async (params?: {
    input?: TemplateListInput;
    config?: Config;
  }): Promise<Template[]> => {
    const { input, config } = params ?? {};
    const cfg = Config.withConfigs(this.config, config);
    const request = new $AgentRun.ListTemplatesRequest({
      ...input,
    });
    const result = await this.controlApi.listTemplates({
      input: request,
      config: cfg,
    });
    return (result?.items || []).map((item) => new Template(item, cfg));
  };

  // ============ Sandbox Operations ============

  /**
   * Create a Sandbox
   */
  createSandbox = async (params: {
    input: SandboxCreateInput;
    config?: Config;
  }): Promise<Sandbox> => {
    const { input, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.createSandbox({
        input: new $AgentRun.CreateSandboxInput({
          ...input,
        }),
        config: cfg,
      });
      return Sandbox.fromInnerObject(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Sandbox', input.templateName);
      }
      throw error;
    }
  };

  /**
   * Create a Code Interpreter Sandbox
   * 创建代码解释器沙箱 / Create Code Interpreter Sandbox
   */
  createCodeInterpreterSandbox = async (params: {
    templateName: string;
    options?: {
      sandboxIdleTimeoutSeconds?: number;
      nasConfig?: NASConfig;
      ossMountConfig?: OSSMountConfig;
      polarFsConfig?: PolarFsConfig;
    };
    config?: Config;
  }): Promise<CodeInterpreterSandbox> => {
    const { templateName, options, config } = params;
    return CodeInterpreterSandbox.createFromTemplate(
      templateName,
      options,
      config ?? this.config
    );
  };

  /**
   * Create a Browser Sandbox
   * 创建浏览器沙箱 / Create Browser Sandbox
   */
  createBrowserSandbox = async (params: {
    templateName: string;
    options?: {
      sandboxIdleTimeoutSeconds?: number;
      nasConfig?: NASConfig;
      ossMountConfig?: OSSMountConfig;
      polarFsConfig?: PolarFsConfig;
    };
    config?: Config;
  }): Promise<BrowserSandbox> => {
    const { templateName, options, config } = params;
    return BrowserSandbox.createFromTemplate(
      templateName,
      options,
      config ?? this.config
    );
  };

  /**
   * Delete a Sandbox
   */
  deleteSandbox = async (params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> => {
    const { id, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.deleteSandbox({
        sandboxId: id,
        config: cfg,
      });
      return Sandbox.fromInnerObject(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Sandbox', id);
      }
      throw error;
    }
  };

  /**
   * Stop a Sandbox
   */
  stopSandbox = async (params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> => {
    const { id, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.stopSandbox({
        sandboxId: id,
        config: cfg,
      });
      return Sandbox.fromInnerObject(result, cfg);
    } catch (error) {
      if (error instanceof HTTPError) {
        throw error.toResourceError('Sandbox', id);
      }
      throw error;
    }
  };

  /**
   * Get a Sandbox
   *
   * @param params.id - Sandbox ID
   * @param params.templateType - Template type to cast the result to the appropriate subclass
   * @param params.config - Configuration
   */
  getSandbox = async (params: {
    id: string;
    templateType?: TemplateType;
    config?: Config;
  }): Promise<Sandbox> => {
    const { id, templateType, config } = params;
    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.getSandbox({
        sandboxId: id,
        config: cfg,
      });
      const baseSandbox = Sandbox.fromInnerObject(result, cfg);

      if (templateType) {
        switch (templateType) {
          case TemplateType.CODE_INTERPRETER: {
            return new CodeInterpreterSandbox(baseSandbox, cfg);
          }
          case TemplateType.BROWSER: {
            return new BrowserSandbox(baseSandbox, cfg);
          }
          case TemplateType.AIO: {
            const { AioSandbox } = await import('./aio-sandbox');
            return new AioSandbox(baseSandbox, cfg);
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
  };

  /**
   * List Sandboxes
   */
  listSandboxes = async (params?: {
    input?: SandboxListInput;
    config?: Config;
  }): Promise<Sandbox[]> => {
    const { input, config } = params ?? {};
    const cfg = Config.withConfigs(this.config, config);
    const request = new $AgentRun.ListSandboxesRequest({
      ...input,
    });
    const result = await this.controlApi.listSandboxes({
      input: request,
      config: cfg,
    });
    return (result.sandboxes || []).map((item: $AgentRun.Sandbox) =>
      Sandbox.fromInnerObject(item, cfg)
    );
  };

  private prepareTemplateCreateInput(
    input: TemplateCreateInput
  ): TemplateCreateInput {
    const defaults = this.getTemplateDefaults(input.templateType);
    const finalInput = { ...defaults, ...input };

    if (!finalInput.networkConfiguration) {
      finalInput.networkConfiguration = {
        networkMode: TemplateNetworkMode.PUBLIC,
      };
    }

    this.validateTemplateCreateInput(finalInput);
    return finalInput;
  }

  private getTemplateDefaults(
    templateType: TemplateType
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

  private validateTemplateCreateInput(input: TemplateCreateInput): void {
    if (
      (input.templateType === TemplateType.BROWSER ||
        input.templateType === TemplateType.AIO) &&
      input.diskSize !== 10240
    ) {
      throw new Error(
        `When templateType is BROWSER or AIO, diskSize must be 10240, got ${input.diskSize}`
      );
    }

    if (
      (input.templateType === TemplateType.CODE_INTERPRETER ||
        input.templateType === TemplateType.AIO) &&
      input.networkConfiguration?.networkMode === TemplateNetworkMode.PRIVATE
    ) {
      throw new Error(
        `When templateType is CODE_INTERPRETER or AIO, networkMode cannot be PRIVATE`
      );
    }
  }
}
