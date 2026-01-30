/**
 * Sandbox Client
 *
 * 此模块提供 Sandbox 的客户端 API。
 * This module provides the client API for Sandbox.
 */

import * as $AgentRun from '@alicloud/agentrun20250910';
import { Config } from '../utils/config';
import { HTTPError } from '../utils/exception';
import { logger } from '../utils/log';
import { SandboxControlAPI } from './api/control';

import { AioSandbox } from './aio-sandbox';
import { BrowserSandbox } from './browser-sandbox';
import { CodeInterpreterSandbox } from './code-interpreter-sandbox';
import { CustomSandbox } from './custom-sandbox';
import {
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  SandboxCreateInput,
  SandboxListInput,
  SandboxState,
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
  createTemplate: {
    (params: { input: TemplateCreateInput; config?: Config }): Promise<Template>;
    /** @deprecated Use createTemplate({ input, config }) instead. */
    (input: TemplateCreateInput, config?: Config): Promise<Template>;
  } = async (
    arg1: { input: TemplateCreateInput; config?: Config } | TemplateCreateInput,
    arg2?: Config
  ): Promise<Template> => {
    let input: TemplateCreateInput;
    let config: Config | undefined;

    if ('input' in arg1) {
      input = arg1.input;
      config = arg1.config;
    } else {
      logger.warn(
        'Deprecated: createTemplate(input, config) is deprecated. Use createTemplate({ input, config }) instead.'
      );
      input = arg1;
      config = arg2;
    }

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
  deleteTemplate: {
    (params: { name: string; config?: Config }): Promise<Template>;
    /** @deprecated Use deleteTemplate({ name, config }) instead. */
    (name: string, config?: Config): Promise<Template>;
  } = async (
    arg1: { name: string; config?: Config } | string,
    arg2?: Config
  ): Promise<Template> => {
    let name: string;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: deleteTemplate(name, config) is deprecated. Use deleteTemplate({ name, config }) instead.'
      );
      name = arg1;
      config = arg2;
    } else {
      name = arg1.name;
      config = arg1.config;
    }

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
  updateTemplate: {
    (params: { name: string; input: TemplateUpdateInput; config?: Config }): Promise<Template>;
    /** @deprecated Use updateTemplate({ name, input, config }) instead. */
    (name: string, input: TemplateUpdateInput, config?: Config): Promise<Template>;
  } = async (
    arg1: { name: string; input: TemplateUpdateInput; config?: Config } | string,
    arg2?: TemplateUpdateInput,
    arg3?: Config
  ): Promise<Template> => {
    let name: string;
    let input: TemplateUpdateInput;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: updateTemplate(name, input, config) is deprecated. Use updateTemplate({ name, input, config }) instead.'
      );
      name = arg1;
      input = arg2 as TemplateUpdateInput;
      config = arg3;
    } else {
      name = arg1.name;
      input = arg1.input;
      config = arg1.config;
    }

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
  getTemplate: {
    (params: { name: string; config?: Config }): Promise<Template>;
    /** @deprecated Use getTemplate({ name, config }) instead. */
    (name: string, config?: Config): Promise<Template>;
  } = async (
    arg1: { name: string; config?: Config } | string,
    arg2?: Config
  ): Promise<Template> => {
    let name: string;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: getTemplate(name, config) is deprecated. Use getTemplate({ name, config }) instead.'
      );
      name = arg1;
      config = arg2;
    } else {
      name = arg1.name;
      config = arg1.config;
    }

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
  listTemplates: {
    (params?: { input?: TemplateListInput; config?: Config }): Promise<Template[]>;
    /** @deprecated Use listTemplates({ input, config }) instead. */
    (input: TemplateListInput, config?: Config): Promise<Template[]>;
  } = async (
    arg1?: { input?: TemplateListInput; config?: Config } | TemplateListInput,
    arg2?: Config
  ): Promise<Template[]> => {
    let input: TemplateListInput | undefined;
    let config: Config | undefined;

    if (arg2 || (arg1 && ('pageNumber' in arg1 || 'pageSize' in arg1 || 'templateType' in arg1))) {
      logger.warn(
        'Deprecated: listTemplates(input, config) is deprecated. Use listTemplates({ input, config }) instead.'
      );
      input = arg1 as TemplateListInput;
      config = arg2;
    } else {
      const params = (arg1 as { input?: TemplateListInput; config?: Config }) ?? {};
      input = params.input;
      config = params.config;
    }

    const cfg = Config.withConfigs(this.config, config);
    const request = new $AgentRun.ListTemplatesRequest({
      ...input,
    });
    const result = await this.controlApi.listTemplates({
      input: request,
      config: cfg,
    });
    return (result?.items || []).map(item => new Template(item, cfg));
  };

  // ============ Sandbox Operations ============

  /**
   * Create a Sandbox
   */
  createSandbox: {
    (params: {
      input: SandboxCreateInput;
      templateType: TemplateType.AIO;
      config?: Config;
    }): Promise<AioSandbox>;
    (params: {
      input: SandboxCreateInput;
      templateType: TemplateType.BROWSER;
      config?: Config;
    }): Promise<BrowserSandbox>;
    (params: {
      input: SandboxCreateInput;
      templateType: TemplateType.CODE_INTERPRETER;
      config?: Config;
    }): Promise<CodeInterpreterSandbox>;
    (params: {
      input: SandboxCreateInput;
      templateType: TemplateType.CUSTOM;
      config?: Config;
    }): Promise<CustomSandbox>;
    (params: {
      input: SandboxCreateInput;
      templateType?: TemplateType;
      config?: Config;
    }): Promise<Sandbox>;
    /** @deprecated Use createSandbox({ input, config }) instead. */
    (input: SandboxCreateInput, config?: Config): Promise<Sandbox>;
  } = async (
    arg1:
      | {
          input: SandboxCreateInput;
          templateType?: TemplateType;
          config?: Config;
        }
      | SandboxCreateInput,
    arg2?: Config
  ): Promise<any> => {
    let input: SandboxCreateInput;
    let templateType: TemplateType | undefined;
    let config: Config | undefined;

    if ('input' in arg1) {
      // New API: createSandbox({ input, templateType?, config? })
      const params = arg1 as {
        input: SandboxCreateInput;
        templateType?: TemplateType;
        config?: Config;
      };
      input = params.input;
      templateType = params.templateType;
      config = params.config;
    } else {
      // Legacy API: createSandbox(input, config?)
      logger.warn(
        'Deprecated: createSandbox(input, config) is deprecated. Use createSandbox({ input, config }) instead.'
      );
      input = arg1 as SandboxCreateInput;
      config = arg2;
    }

    const cfg = Config.withConfigs(this.config, config);

    try {
      const result = await this.controlApi.createSandbox({
        input: new $AgentRun.CreateSandboxInput({
          ...input,
        }),
        config: cfg,
      });

      const state = ((result as { status?: string; state?: string }).status ??
        (result as { status?: string; state?: string }).state) as SandboxState | undefined;
      const sb = new Sandbox({ ...result, state }, cfg);

      if (templateType === TemplateType.CODE_INTERPRETER)
        return new CodeInterpreterSandbox(sb, cfg);
      else if (templateType === TemplateType.BROWSER) return new BrowserSandbox(sb, cfg);
      else if (templateType === TemplateType.AIO) return new AioSandbox(sb, cfg);
      else if (templateType === TemplateType.CUSTOM) return new CustomSandbox(sb, cfg);

      return sb;
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
    return CodeInterpreterSandbox.createFromTemplate(templateName, options, config ?? this.config);
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
    return BrowserSandbox.createFromTemplate(templateName, options, config ?? this.config);
  };

  /**
   * Delete a Sandbox
   */
  deleteSandbox: {
    (params: { id: string; config?: Config }): Promise<Sandbox>;
    /** @deprecated Use deleteSandbox({ id, config }) instead. */
    (id: string, config?: Config): Promise<Sandbox>;
  } = async (arg1: { id: string; config?: Config } | string, arg2?: Config): Promise<Sandbox> => {
    let id: string;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: deleteSandbox(id, config) is deprecated. Use deleteSandbox({ id, config }) instead.'
      );
      id = arg1;
      config = arg2;
    } else {
      id = arg1.id;
      config = arg1.config;
    }

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
  stopSandbox: {
    (params: { id: string; config?: Config }): Promise<Sandbox>;
    /** @deprecated Use stopSandbox({ id, config }) instead. */
    (id: string, config?: Config): Promise<Sandbox>;
  } = async (arg1: { id: string; config?: Config } | string, arg2?: Config): Promise<Sandbox> => {
    let id: string;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: stopSandbox(id, config) is deprecated. Use stopSandbox({ id, config }) instead.'
      );
      id = arg1;
      config = arg2;
    } else {
      id = arg1.id;
      config = arg1.config;
    }

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
  getSandbox: {
    (params: { id: string; templateType?: TemplateType; config?: Config }): Promise<Sandbox>;
    /** @deprecated Use getSandbox({ id, templateType, config }) instead. */
    (id: string, templateType?: TemplateType, config?: Config): Promise<Sandbox>;
  } = async (
    arg1: { id: string; templateType?: TemplateType; config?: Config } | string,
    arg2?: TemplateType | Config,
    arg3?: Config
  ): Promise<Sandbox> => {
    let id: string;
    let templateType: TemplateType | undefined;
    let config: Config | undefined;

    if (typeof arg1 === 'string') {
      logger.warn(
        'Deprecated: getSandbox(id, templateType, config?) is deprecated. Use getSandbox({ id, templateType, config }) instead.'
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
  listSandboxes: {
    (params?: { input?: SandboxListInput; config?: Config }): Promise<Sandbox[]>;
    /** @deprecated Use listSandboxes({ input, config }) instead. */
    (input: SandboxListInput, config?: Config): Promise<Sandbox[]>;
  } = async (
    arg1?: { input?: SandboxListInput; config?: Config } | SandboxListInput,
    arg2?: Config
  ): Promise<Sandbox[]> => {
    let input: SandboxListInput | undefined;
    let config: Config | undefined;

    if (
      arg2 ||
      (arg1 &&
        ('maxResults' in arg1 ||
          'nextToken' in arg1 ||
          'status' in arg1 ||
          'templateName' in arg1 ||
          'templateType' in arg1))
    ) {
      logger.warn(
        'Deprecated: listSandboxes(input, config) is deprecated. Use listSandboxes({ input, config }) instead.'
      );
      input = arg1 as SandboxListInput;
      config = arg2;
    } else {
      const params = (arg1 as { input?: SandboxListInput; config?: Config }) ?? {};
      input = params.input;
      config = params.config;
    }

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

  private prepareTemplateCreateInput(input: TemplateCreateInput): TemplateCreateInput {
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

  private getTemplateDefaults(templateType: TemplateType): Partial<TemplateCreateInput> {
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
      (input.templateType === TemplateType.BROWSER || input.templateType === TemplateType.AIO) &&
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
