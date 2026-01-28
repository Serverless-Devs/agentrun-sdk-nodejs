/**
 * Custom Sandbox
 *
 * 自定义镜像沙箱 / Custom Image Sandbox
 */

import { Config } from "../utils/config";

import {
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  TemplateType,
} from "./model";
import { Sandbox } from "./sandbox";
import { SandboxDataAPI } from "./api/sandbox-data";

/**
 * Custom Sandbox
 *
 * 自定义镜像沙箱类 / Custom Image Sandbox Class
 */
export class CustomSandbox extends Sandbox {
  static templateType = TemplateType.CUSTOM;

  /**
   * Create a Custom Sandbox from template
   * 从模板创建自定义沙箱 / Create Custom Sandbox from Template
   */
  static async createFromTemplate(
    templateName: string,
    options?: {
      sandboxIdleTimeoutInSeconds?: number;
      nasConfig?: NASConfig;
      ossMountConfig?: OSSMountConfig;
      polarFsConfig?: PolarFsConfig;
    },
    config?: Config
  ): Promise<CustomSandbox> {
    const sandbox = await Sandbox.create(
      {
        templateName,
        sandboxIdleTimeoutInSeconds: options?.sandboxIdleTimeoutInSeconds,
        nasConfig: options?.nasConfig,
        ossMountConfig: options?.ossMountConfig,
        polarFsConfig: options?.polarFsConfig,
      },
      config
    );

    const customSandbox = new CustomSandbox(sandbox, config);
    return customSandbox;
  }

  constructor(sandbox: Sandbox, config?: Config) {
    super(sandbox, config);
  }

  private _dataApi?: SandboxDataAPI;

  /**
   * Get data API client
   */
  get dataApi(): SandboxDataAPI {
    if (!this._dataApi) {
      this._dataApi = new SandboxDataAPI({
        sandboxId: this.sandboxId || "",
        config: this._config,
      });
    }
    return this._dataApi;
  }

  /**
   * Get base URL for the sandbox
   * 获取沙箱的基础 URL / Get base URL for the sandbox
   *
   * @returns 基础 URL / Base URL
   */
  getBaseUrl(): string {
    const cfg = Config.withConfigs(this._config);
    return `${cfg.dataEndpoint}/sandboxes/${this.sandboxId}`;
  }
}
