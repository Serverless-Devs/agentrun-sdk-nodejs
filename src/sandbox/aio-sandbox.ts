/**
 * AIO (All-In-One) Sandbox
 *
 * Combines both Code Interpreter and Browser sandbox functionalities
 * into a single unified interface.
 */

import { Config } from "../utils/config";
import { logger } from "../utils/log";
import { ServerError } from "../utils/exception";

import { AioDataAPI } from "./api/aio-data";
import {
  CodeLanguage,
  NASConfig,
  OSSMountConfig,
  PolarFsConfig,
  TemplateType,
} from "./model";
import { Sandbox } from "./sandbox";

/**
 * File upload/download operations
 */
export class AioFileOperations {
  private sandbox: AioSandbox;

  constructor(sandbox: AioSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * Read a file from the sandbox
   */
  read = async (path: string): Promise<any> => {
    return this.sandbox.dataApi.readFile({ path });
  };

  /**
   * Write a file to the sandbox
   */
  write = async (params: {
    path: string;
    content: string;
    mode?: string;
    encoding?: string;
    createDir?: boolean;
  }): Promise<any> => {
    return this.sandbox.dataApi.writeFile(params);
  };
}

/**
 * File system operations (list, move, remove, stat, mkdir)
 */
export class AioFileSystemOperations {
  private sandbox: AioSandbox;

  constructor(sandbox: AioSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * List directory contents
   */
  list = async (params?: { path?: string; depth?: number }): Promise<any> => {
    return this.sandbox.dataApi.listDirectory(params);
  };

  /**
   * Move a file or directory
   */
  move = async (params: { source: string; destination: string }): Promise<any> => {
    return this.sandbox.dataApi.moveFile(params);
  };

  /**
   * Remove a file or directory
   */
  remove = async (params: { path: string }): Promise<any> => {
    return this.sandbox.dataApi.removeFile(params);
  };

  /**
   * Get file or directory statistics
   */
  stat = async (params: { path: string }): Promise<any> => {
    return this.sandbox.dataApi.stat(params);
  };

  /**
   * Create a directory
   */
  mkdir = async (params: {
    path: string;
    parents?: boolean;
    mode?: string;
  }): Promise<any> => {
    return this.sandbox.dataApi.mkdir(params);
  };

  /**
   * Upload a file to the sandbox
   */
  upload = async (params: {
    localFilePath: string;
    targetFilePath: string;
  }): Promise<any> => {
    return this.sandbox.dataApi.uploadFile(params);
  };

  /**
   * Download a file from the sandbox
   */
  download = async (params: {
    path: string;
    savePath: string;
  }): Promise<{ savedPath: string; size: number }> => {
    return this.sandbox.dataApi.downloadFile(params);
  };
}

/**
 * Process management operations
 */
export class AioProcessOperations {
  private sandbox: AioSandbox;

  constructor(sandbox: AioSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * Execute a command in the sandbox
   */
  cmd = async (params: {
    command: string;
    cwd: string;
    timeout?: number;
  }): Promise<any> => {
    return this.sandbox.dataApi.cmd(params);
  };

  /**
   * List all processes
   */
  list = async (params?: { config?: Config }): Promise<any> => {
    return this.sandbox.dataApi.listProcesses(params);
  };

  /**
   * Get a specific process by PID
   */
  get = async (params: { pid: string }): Promise<any> => {
    return this.sandbox.dataApi.getProcess(params);
  };

  /**
   * Kill a specific process by PID
   */
  kill = async (params: { pid: string }): Promise<any> => {
    return this.sandbox.dataApi.killProcess(params);
  };
}

/**
 * Context management operations
 */
export class AioContextOperations {
  private sandbox: AioSandbox;
  private _contextId?: string;
  private _language?: CodeLanguage;
  private _cwd?: string;

  constructor(sandbox: AioSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * Get the current context ID
   */
  get contextId(): string | undefined {
    return this._contextId;
  }

  /**
   * List all contexts
   */
  list = async (params?: { config?: Config }): Promise<any> => {
    return this.sandbox.dataApi.listContexts(params);
  };

  /**
   * Create a new context and save its ID
   */
  create = async (params?: {
    language?: CodeLanguage;
    cwd?: string;
  }): Promise<AioContextOperations> => {
    const language = params?.language || CodeLanguage.PYTHON;
    const cwd = params?.cwd || "/home/user";

    const result = await this.sandbox.dataApi.createContext({
      language,
      cwd,
    });

    if (result?.id && result?.cwd && result?.language) {
      this._contextId = result.id;
      this._language = result.language;
      this._cwd = result.cwd;
      return this;
    }

    throw new ServerError(500, "Failed to create context");
  };

  /**
   * Get a specific context by ID
   */
  get = async (params?: { contextId?: string }): Promise<AioContextOperations> => {
    const id = params?.contextId || this._contextId;
    if (!id) {
      logger.error("context id is not set");
      throw new Error("context id is not set");
    }

    const result = await this.sandbox.dataApi.getContext({ contextId: id });

    if (result?.id && result?.cwd && result?.language) {
      this._contextId = result.id;
      this._language = result.language;
      this._cwd = result.cwd;
      return this;
    }

    throw new ServerError(500, "Failed to get context");
  };

  /**
   * Execute code in a context
   */
  execute = async (params: {
    code: string;
    language?: CodeLanguage;
    contextId?: string;
    timeout?: number;
  }): Promise<any> => {
    const { code, timeout = 30 } = params;
    let { contextId, language } = params;

    if (!contextId) {
      contextId = this._contextId;
    }

    if (!contextId && !language) {
      logger.debug("context id is not set, use default language: python");
      language = CodeLanguage.PYTHON;
    }

    return this.sandbox.dataApi.executeCode({
      code,
      contextId,
      language,
      timeout,
    });
  };

  /**
   * Delete a context
   */
  delete = async (params?: { contextId?: string }): Promise<any> => {
    const id = params?.contextId || this._contextId;
    if (!id) {
      throw new Error(
        "context_id is required. Either pass it as parameter or create a context first.",
      );
    }

    const result = await this.sandbox.dataApi.deleteContext({ contextId: id });
    // Clear the saved context_id after deletion
    this._contextId = undefined;
    return result;
  };
}

/**
 * AIO (All-In-One) Sandbox
 *
 * Combines both Code Interpreter and Browser sandbox functionalities.
 */
export class AioSandbox extends Sandbox {
  static templateType = TemplateType.AIO;

  /**
   * Create an AIO Sandbox from template
   * 从模板创建 AIO 沙箱 / Create AIO Sandbox from Template
   */
  static async createFromTemplate(
    templateName: string,
    options?: {
      sandboxIdleTimeoutSeconds?: number;
      nasConfig?: NASConfig;
      ossMountConfig?: OSSMountConfig;
      polarFsConfig?: PolarFsConfig;
    },
    config?: Config,
  ): Promise<AioSandbox> {
    const sandbox = await Sandbox.create(
      {
        templateName,
        sandboxIdleTimeoutSeconds: options?.sandboxIdleTimeoutSeconds,
        nasConfig: options?.nasConfig,
        ossMountConfig: options?.ossMountConfig,
        polarFsConfig: options?.polarFsConfig,
      },
      config,
    );

    const aioSandbox = new AioSandbox(sandbox, config);
    return aioSandbox;
  }

  constructor(sandbox: Sandbox, config?: Config) {
    super(sandbox, config);
  }

  private _dataApi?: AioDataAPI;
  private _file?: AioFileOperations;
  private _fileSystem?: AioFileSystemOperations;
  private _context?: AioContextOperations;
  private _process?: AioProcessOperations;

  /**
   * Get data API client
   */
  get dataApi(): AioDataAPI {
    if (!this._dataApi) {
      this._dataApi = new AioDataAPI({
        sandboxId: this.sandboxId || "",
        config: this._config,
      });
    }
    return this._dataApi;
  }

  /**
   * Access file upload/download operations
   */
  get file(): AioFileOperations {
    if (!this._file) {
      this._file = new AioFileOperations(this);
    }
    return this._file;
  }

  /**
   * Access file system operations
   */
  get fileSystem(): AioFileSystemOperations {
    if (!this._fileSystem) {
      this._fileSystem = new AioFileSystemOperations(this);
    }
    return this._fileSystem;
  }

  /**
   * Access context management operations
   */
  get context(): AioContextOperations {
    if (!this._context) {
      this._context = new AioContextOperations(this);
    }
    return this._context;
  }

  /**
   * Access process management operations
   */
  get process(): AioProcessOperations {
    if (!this._process) {
      this._process = new AioProcessOperations(this);
    }
    return this._process;
  }

  /**
   * Check sandbox health
   */
  checkHealth = async (params?: { config?: Config }): Promise<{ status: string; [key: string]: any }> => {
    return this.dataApi.checkHealth({ 
      sandboxId: this.sandboxId!, 
      config: params?.config 
    });
  };

  /**
   * Wait for sandbox to be ready (polls health check)
   */
  waitUntilReady = async (params?: {
    maxRetries?: number;
    retryIntervalMs?: number;
  }): Promise<void> => {
    const maxRetries = params?.maxRetries || 60;
    const retryIntervalMs = params?.retryIntervalMs || 1000;
    let retryCount = 0;

    logger.debug("Waiting for AIO sandbox to be ready...");

    while (retryCount < maxRetries) {
      retryCount += 1;

      try {
        const health = await this.checkHealth();

        if (health.status === "ok") {
          logger.debug(`✓ AIO Sandbox is ready! (took ${retryCount} seconds)`);
          return;
        }

        logger.debug(`[${retryCount}/${maxRetries}] Health status: not ready`);
        logger.debug(
          `[${retryCount}/${maxRetries}] Health status: ${health.code} ${health.message}`,
        );
      } catch (error) {
        logger.error(`[${retryCount}/${maxRetries}] Health check failed: ${error}`);
      }

      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }

    throw new Error(
      `Health check timeout after ${maxRetries} seconds. ` +
        "AIO sandbox did not become ready in time.",
    );
  };

  // ========================================
  // Browser API Methods
  // ========================================

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
   * List all browser recordings
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
  deleteRecording = async (params: { filename: string; config?: Config }): Promise<any> => {
    return this.dataApi.deleteRecording(params);
  };

  // ========================================
  // Code Interpreter API Methods
  // ========================================

  /**
   * Execute code (convenience method delegating to context.execute)
   */
  execute = async (params: {
    code: string;
    language?: CodeLanguage;
    contextId?: string;
    timeout?: number;
  }): Promise<any> => {
    return this.context.execute(params);
  };
}
