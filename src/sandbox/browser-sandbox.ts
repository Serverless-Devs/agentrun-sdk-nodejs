/**
 * Browser Sandbox
 *
 * High-level API for browser sandboxes with CDP/VNC connectivity
 * and recording management.
 */

import { Config } from '../utils/config';

import { BrowserDataAPI } from './api/browser-data';
import {
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  TemplateType,
} from './model';
import { Sandbox } from './sandbox';

/**
 * Browser Sandbox
 *
 * High-level API for interacting with browser sandboxes.
 */
export class BrowserSandbox extends Sandbox {
  static templateType = TemplateType.BROWSER;

  /**
   * Create a Browser Sandbox from template
   * 从模板创建浏览器沙箱 / Create Browser Sandbox from Template
   */
  static async createFromTemplate(
    templateName: string,
    options?: {
      sandboxIdleTimeoutSeconds?: number;
      nasConfig?: NASConfig;
      ossMountConfig?: OSSMountConfig;
      polarFsConfig?: PolarFsConfig;
    },
    config?: Config
  ): Promise<BrowserSandbox> {
    const sandbox = await Sandbox.create({
      input: {
        templateName,
        sandboxIdleTimeoutSeconds: options?.sandboxIdleTimeoutSeconds,
        nasConfig: options?.nasConfig,
        ossMountConfig: options?.ossMountConfig,
        polarFsConfig: options?.polarFsConfig,
      },
      templateType: TemplateType.BROWSER,
      config,
    });

    return sandbox as BrowserSandbox;
  }

  constructor(sandbox: Sandbox, config?: Config) {
    super(sandbox, config);
  }

  private _dataApi?: BrowserDataAPI;

  /**
   * Get data API client
   */
  get dataApi(): BrowserDataAPI {
    if (!this._dataApi) {
      if (!this.sandboxId) {
        throw new Error('Sandbox ID is not set');
      }

      this._dataApi = new BrowserDataAPI({
        sandboxId: this.sandboxId,
        config: this._config,
      });
    }
    return this._dataApi;
  }

  /**
   * Check sandbox health
   */
  checkHealth = async (params?: {
    config?: Config;
  }): Promise<{ status: string; [key: string]: any }> => {
    return this.dataApi.checkHealth({
      sandboxId: this.sandboxId!,
      config: params?.config,
    });
  };

  /**
   * Get CDP WebSocket URL for browser automation
   */
  getCdpUrl(record?: boolean): string {
    return this.dataApi.getCdpUrl(record);
  }

  /**
   * Get VNC WebSocket URL for live view
   */
  getVncUrl(record?: boolean): string {
    return this.dataApi.getVncUrl(record);
  }

  /**
   * List all recordings
   */
  listRecordings = async (params?: { config?: Config }): Promise<any> => {
    return this.dataApi.listRecordings(params);
  };

  /**
   * Download a recording video file
   */
  downloadRecording = async (params: {
    filename: string;
    savePath: string;
  }): Promise<{ savedPath: string; size: number }> => {
    return this.dataApi.downloadRecording(params);
  };

  /**
   * Delete a recording
   */
  deleteRecording = async (params: {
    filename: string;
    config?: Config;
  }): Promise<any> => {
    return this.dataApi.deleteRecording(params);
  };
}
