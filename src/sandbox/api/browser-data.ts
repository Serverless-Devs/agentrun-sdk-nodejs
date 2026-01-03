/**
 * Browser Sandbox Data API
 *
 * This module provides data API methods for Browser sandboxes.
 * 此模块提供浏览器沙箱的数据 API 方法。
 */

import * as fs from "fs";

import { Config } from "../../utils/config";
import { ClientError } from "../../utils/exception";
import { logger } from "../../utils/log";

import { SandboxDataAPI } from "./sandbox-data";

/**
 * Browser Data API
 *
 * Provides methods for interacting with Browser sandbox data endpoints.
 */
export class BrowserDataAPI extends SandboxDataAPI {
  protected sandboxId: string;

  constructor(params: { sandboxId: string; config?: Config }) {
    super({
      sandboxId: params.sandboxId,
      config: params.config,
      // Set namespace to include sandboxId for CDP/VNC URL generation
      namespace: `sandboxes/${params.sandboxId}`,
    });
    this.sandboxId = params.sandboxId;
  }

  /**
   * Generate the WebSocket URL for Chrome DevTools Protocol (CDP) connection
   */
  getCdpUrl(record?: boolean): string {
    const cdpUrl = this.withPath("/ws/automation").replace("http", "ws");
    const url = new URL(cdpUrl);

    url.searchParams.set("tenantId", this.config.accountId);
    if (record) {
      url.searchParams.set("recording", "true");
    }

    return url.toString();
  }

  /**
   * Generate the WebSocket URL for VNC (Virtual Network Computing) live view connection
   */
  getVncUrl(record?: boolean): string {
    const vncUrl = this.withPath("/ws/liveview").replace("http", "ws");
    const url = new URL(vncUrl);

    url.searchParams.set("tenantId", this.config.accountId);
    if (record) {
      url.searchParams.set("recording", "true");
    }

    return url.toString();
  }


  /**
   * List all recordings
   */
  listRecordings = async (params?: { config?: Config }): Promise<any> => {
    return this.get({ path: "/recordings", config: params?.config });
  };

  /**
   * Delete a recording
   */
  deleteRecording = async (params: { filename: string; config?: Config }): Promise<any> => {
    return this.delete({ path: `/recordings/${params.filename}`, config: params.config });
  };

  /**
   * Download a recording video file
   */
  downloadRecording = async (params: {
    filename: string;
    savePath: string;
  }): Promise<{ savedPath: string; size: number }> => {
    return this.getVideo({
      path: `/recordings/${params.filename}`,
      savePath: params.savePath,
    });
  };

  /**
   * Helper method to download video file
   */
  protected async getVideo(params: {
    path: string;
    savePath: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<{ savedPath: string; size: number }> {
    const url = this.withPath(params.path, params.query);

    // Prepare headers with auth
    const cfg = Config.withConfigs(this.config, params.config);
    const reqHeaders = this.prepareHeaders({ headers: params.headers, config: cfg });

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: reqHeaders,
        signal: AbortSignal.timeout(cfg.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ClientError(response.status, errorText);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.promises.writeFile(params.savePath, buffer);

      return {
        savedPath: params.savePath,
        size: buffer.length,
      };
    } catch (error) {
      if (error instanceof ClientError) {
        throw error;
      }
      logger.error(`Download video error: ${error}`);
      throw new ClientError(0, `Download video error: ${error}`);
    }
  }
}
