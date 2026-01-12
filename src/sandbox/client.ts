/**
 * Sandbox Client
 *
 * 此模块提供 Sandbox 的客户端 API。
 * This module provides the client API for Sandbox.
 */

import { Config } from "../utils/config";

import { BrowserSandbox } from "./browser-sandbox";
import { CodeInterpreterSandbox } from "./code-interpreter-sandbox";
import {
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  SandboxCreateInput,
  SandboxListInput,
  TemplateCreateInput,
  TemplateListInput,
  TemplateType,
  TemplateUpdateInput,
} from "./model";
import { Sandbox } from "./sandbox";
import { Template } from "./template";

/**
 * Sandbox Client
 *
 * 提供 Sandbox 和 Template 的管理功能。
 */
export class SandboxClient {
  private config?: Config;

  constructor(config?: Config) {
    this.config = config;
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
    return Template.create({ input, config: config ?? this.config });
  };

  /**
   * Delete a Template
   */
  deleteTemplate = async (params: {
    name: string;
    config?: Config;
  }): Promise<Template> => {
    const { name, config } = params;
    return Template.delete({ name, config: config ?? this.config });
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
    return Template.update({ name, input, config: config ?? this.config });
  };

  /**
   * Get a Template
   */
  getTemplate = async (params: {
    name: string;
    config?: Config;
  }): Promise<Template> => {
    const { name, config } = params;
    return Template.get({ name, config: config ?? this.config });
  };

  /**
   * List Templates
   */
  listTemplates = async (params?: {
    input?: TemplateListInput;
    config?: Config;
  }): Promise<Template[]> => {
    const { input, config } = params ?? {};
    return Template.list(input, config ?? this.config);
  };

  /**
   * List all Templates
   */
  listAllTemplates = async (params?: {
    options?: { templateType?: TemplateType };
    config?: Config;
  }): Promise<Template[]> => {
    const { options, config } = params ?? {};
    return Template.listAll(options, config ?? this.config);
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
    return Sandbox.create(input, config ?? this.config);
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
      config ?? this.config,
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
      config ?? this.config,
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
    return Sandbox.delete({ id, config: config ?? this.config });
  };

  /**
   * Stop a Sandbox
   */
  stopSandbox = async (params: {
    id: string;
    config?: Config;
  }): Promise<Sandbox> => {
    const { id, config } = params;
    return Sandbox.stop({ id, config: config ?? this.config });
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
    return Sandbox.get({ id, templateType, config: config ?? this.config });
  };

  /**
   * List Sandboxes
   */
  listSandboxes = async (params?: {
    input?: SandboxListInput;
    config?: Config;
  }): Promise<Sandbox[]> => {
    const { input, config } = params ?? {};
    return Sandbox.list(input, config ?? this.config);
  };
}
