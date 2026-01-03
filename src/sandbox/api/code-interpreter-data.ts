/**
 * Code Interpreter Sandbox Data API
 *
 * This module provides data API methods for Code Interpreter sandboxes.
 * 此模块提供代码解释器沙箱的数据 API 方法。
 */

import * as fs from "fs";
import * as path from "path";

import { Config } from "../../utils/config";
import { ClientError } from "../../utils/exception";
import { logger } from "../../utils/log";
import { CodeLanguage } from "../model";

import { SandboxDataAPI } from "./sandbox-data";

/**
 * Code Interpreter Data API
 *
 * Provides methods for interacting with Code Interpreter sandbox data endpoints.
 */
export class CodeInterpreterDataAPI extends SandboxDataAPI {
  constructor(params: { sandboxId: string; config?: Config }) {
    super({
      sandboxId: params.sandboxId,
      config: params.config,
      // Set namespace to include sandboxId for correct API path generation
      namespace: `sandboxes/${params.sandboxId}`,
    });
  }

  /**
   * List directory contents
   */
  async listDirectory(params?: {
    path?: string;
    depth?: number;
    config?: Config;
  }): Promise<any> {
    const query: Record<string, any> = {};
    if (params?.path !== undefined) {
      query.path = params.path;
    }
    if (params?.depth !== undefined) {
      query.depth = params.depth;
    }

    return this.get({ path: "/filesystem", query, config: params?.config });
  }

  /**
   * Get file/directory stats
   */
  async stat(params: { path: string; config?: Config }): Promise<any> {
    const query = {
      path: params.path,
    };
    return this.get({ path: "/filesystem/stat", query, config: params.config });
  }

  /**
   * Create directory
   */
  async mkdir(params: {
    path: string;
    parents?: boolean;
    mode?: string;
    config?: Config;
  }): Promise<any> {
    const data = {
      path: params.path,
      parents: params.parents !== undefined ? params.parents : true,
      mode: params.mode || "0755",
    };
    return this.post({ path: "/filesystem/mkdir", data, config: params.config });
  }

  /**
   * Move file or directory
   */
  async moveFile(params: {
    source: string;
    destination: string;
    config?: Config;
  }): Promise<any> {
    const data = {
      source: params.source,
      destination: params.destination,
    };
    return this.post({ path: "/filesystem/move", data, config: params.config });
  }

  /**
   * Remove file or directory
   */
  async removeFile(params: { path: string; config?: Config }): Promise<any> {
    const data = {
      path: params.path,
    };
    return this.post({ path: "/filesystem/remove", data, config: params.config });
  }

  /**
   * List code execution contexts
   */
  async listContexts(params?: { config?: Config }): Promise<any> {
    return this.get({ path: "/contexts", config: params?.config });
  }

  /**
   * Create a new code execution context
   */
  async createContext(params?: {
    language?: CodeLanguage;
    cwd?: string;
    config?: Config;
  }): Promise<any> {
    const language = params?.language || CodeLanguage.PYTHON;
    const cwd = params?.cwd || "/home/user";

    // Validate language parameter
    if (language !== "python" && language !== "javascript") {
      throw new Error(
        `language must be 'python' or 'javascript', got: ${language}`,
      );
    }

    const data: Record<string, any> = {
      cwd,
      language,
    };
    return this.post({ path: "/contexts", data, config: params?.config });
  }

  /**
   * Get context details
   */
  async getContext(params: { contextId: string; config?: Config }): Promise<any> {
    return this.get({ path: `/contexts/${params.contextId}`, config: params.config });
  }

  /**
   * Execute code in a context
   */
  async executeCode(params: {
    code: string;
    contextId?: string;
    language?: CodeLanguage;
    timeout?: number;
    config?: Config;
  }): Promise<any> {
    const { code, contextId, language, timeout = 30, config } = params;

    if (language && language !== "python" && language !== "javascript") {
      throw new Error(
        `language must be 'python' or 'javascript', got: ${language}`,
      );
    }

    const data: Record<string, any> = {
      code,
    };

    if (timeout !== undefined) {
      data.timeout = timeout;
    }
    if (language !== undefined) {
      data.language = language;
    }
    if (contextId !== undefined) {
      data.contextId = contextId;
    }

    return this.post({ path: "/contexts/execute", data, config });
  }

  /**
   * Delete a context
   */
  async deleteContext(params: { contextId: string; config?: Config }): Promise<any> {
    return this.delete({ path: `/contexts/${params.contextId}`, config: params.config });
  }

  /**
   * Read file contents
   */
  async readFile(params: { path: string; config?: Config }): Promise<any> {
    const query = {
      path: params.path,
    };
    return this.get({ path: "/files", query, config: params.config });
  }

  /**
   * Write file contents
   */
  async writeFile(params: {
    path: string;
    content: string;
    mode?: string;
    encoding?: string;
    createDir?: boolean;
    config?: Config;
  }): Promise<any> {
    const data = {
      path: params.path,
      content: params.content,
      mode: params.mode || "644",
      encoding: params.encoding || "utf-8",
      createDir: params.createDir !== undefined ? params.createDir : true,
    };
    return this.post({ path: "/files", data, config: params.config });
  }

  /**
   * Upload file to sandbox
   */
  async uploadFile(params: {
    localFilePath: string;
    targetFilePath: string;
    config?: Config;
  }): Promise<any> {
    return this.postFile({
      path: "/filesystem/upload",
      localFilePath: params.localFilePath,
      targetFilePath: params.targetFilePath,
      config: params.config,
    });
  }

  /**
   * Download file from sandbox
   */
  async downloadFile(params: {
    path: string;
    savePath: string;
    config?: Config;
  }): Promise<{ savedPath: string; size: number }> {
    const query = { path: params.path };
    return this.getFile({
      path: "/filesystem/download",
      savePath: params.savePath,
      query,
      config: params.config,
    });
  }

  /**
   * Execute shell command
   */
  async cmd(params: {
    command: string;
    cwd: string;
    timeout?: number;
    config?: Config;
  }): Promise<any> {
    const data: Record<string, any> = {
      command: params.command,
      cwd: params.cwd,
    };

    if (params.timeout !== undefined) {
      data.timeout = params.timeout;
    }

    return this.post({ path: "/processes/cmd", data, config: params.config });
  }

  /**
   * List running processes
   */
  async listProcesses(params?: { config?: Config }): Promise<any> {
    return this.get({ path: "/processes", config: params?.config });
  }

  /**
   * Get process details
   */
  async getProcess(params: { pid: string; config?: Config }): Promise<any> {
    return this.get({ path: `/processes/${params.pid}`, config: params.config });
  }

  /**
   * Kill a process
   */
  async killProcess(params: { pid: string; config?: Config }): Promise<any> {
    return this.delete({ path: `/processes/${params.pid}`, config: params.config });
  }

  /**
   * Helper method to upload file using multipart/form-data
   */
  protected async postFile(params: {
    path: string;
    localFilePath: string;
    targetFilePath: string;
    formData?: Record<string, any>;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<any> {
    const filename = path.basename(params.localFilePath);
    const url = this.withPath(params.path, params.query);

    const reqHeaders = this.prepareHeaders({ headers: params.headers, config: params.config });
    delete reqHeaders["Content-Type"]; // Let fetch set it with boundary

    try {
      const fileContent = await fs.promises.readFile(params.localFilePath);

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([fileContent]),
        filename,
      );

      const data = params.formData || {};
      data.path = params.targetFilePath;

      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const cfg = Config.withConfigs(this.config, params.config);
      const response = await fetch(url, {
        method: "POST",
        headers: reqHeaders,
        body: formData,
        signal: AbortSignal.timeout(cfg.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ClientError(response.status, errorText);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ClientError) {
        throw error;
      }
      logger.error(`Upload file error: ${error}`);
      throw new ClientError(0, `Upload file error: ${error}`);
    }
  }

  /**
   * Helper method to download file
   */
  protected async getFile(params: {
    path: string;
    savePath: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    config?: Config;
  }): Promise<{ savedPath: string; size: number }> {
    const url = this.withPath(params.path, params.query);
    const reqHeaders = this.prepareHeaders({ headers: params.headers, config: params.config });

    try {
      const cfg = Config.withConfigs(this.config, params.config);
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
      logger.error(`Download file error: ${error}`);
      throw new ClientError(0, `Download file error: ${error}`);
    }
  }
}
