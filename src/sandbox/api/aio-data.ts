/**
 * AIO (All-In-One) Sandbox Data API
 *
 * This module provides a combined data API that includes both Code Interpreter
 * and Browser sandbox functionalities.
 * 此模块提供包含代码解释器和浏览器沙箱功能的组合数据 API。
 */

import { Config } from '../../utils/config';
import { BrowserDataAPI } from './browser-data';
import { CodeInterpreterDataAPI } from './code-interpreter-data';

/**
 * AIO Data API
 *
 * Combines both Code Interpreter and Browser data API methods.
 */
export class AioDataAPI extends CodeInterpreterDataAPI {
  private browserAPI: BrowserDataAPI;

  constructor(params: { sandboxId: string; config?: Config }) {
    super({
      sandboxId: params.sandboxId,
      config: params.config,
    });

    this.browserAPI = new BrowserDataAPI({
      sandboxId: params.sandboxId,
      config: params.config,
    });
  }

  // Browser API methods - delegate to browserAPI

  /**
   * Get CDP WebSocket URL for browser automation
   */
  getCdpUrl(record?: boolean): string {
    return this.browserAPI.getCdpUrl(record);
  }

  /**
   * Get VNC WebSocket URL for live view
   */
  getVncUrl(record?: boolean): string {
    return this.browserAPI.getVncUrl(record);
  }

  /**
   * List browser recordings
   */
  listRecordings = async (params?: { config?: Config }): Promise<any> => {
    return this.browserAPI.listRecordings(params);
  };

  /**
   * Delete a recording
   */
  deleteRecording = async (params: { filename: string; config?: Config }): Promise<any> => {
    return this.browserAPI.deleteRecording(params);
  };

  /**
   * Download a recording
   */
  downloadRecording = async (params: {
    filename: string;
    savePath: string;
  }): Promise<{ savedPath: string; size: number }> => {
    return this.browserAPI.downloadRecording(params);
  };
}
