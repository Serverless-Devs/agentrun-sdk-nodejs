/**
 * Sandbox ToolSet Module
 *
 * Provides sandbox toolsets for code interpreter and browser automation.
 * 提供代码解释器和浏览器自动化的沙箱工具集。
 */

import type { Config } from '@/utils/config';
import { logger } from '@/utils/log';
import {
  Sandbox,
  SandboxClient,
  CodeInterpreterSandbox,
  BrowserSandbox,
  TemplateType,
  CodeLanguage,
} from '@/sandbox';

import {
  Tool,
  CommonToolSet,
  type ToolParametersSchema,
  type ToolFunction,
} from './tool';

// Import Playwright types from optional dependency declaration
import type { Browser, Page } from 'playwright';

/**
 * Helper to create a tool with proper typing
 */
function createTool(options: {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
  func: ToolFunction;
}): Tool {
  return new Tool(options);
}

/**
 * Base SandboxToolSet class
 * 沙箱工具集基类
 *
 * Provides sandbox lifecycle management and tool execution infrastructure.
 */
export abstract class SandboxToolSet extends CommonToolSet {
  protected config?: Config;
  protected client: SandboxClient;
  protected templateName: string;
  protected templateType: TemplateType;
  protected sandboxIdleTimeoutSeconds: number;

  protected sandbox: Sandbox | null = null;
  protected sandboxId: string = '';

  constructor(options: {
    templateName: string;
    templateType: TemplateType;
    sandboxIdleTimeoutSeconds?: number;
    config?: Config;
  }) {
    super(options?.templateName);

    this.config = options.config;
    this.client = new SandboxClient(options.config);
    this.templateName = options.templateName;
    this.templateType = options.templateType;
    this.sandboxIdleTimeoutSeconds =
      options.sandboxIdleTimeoutSeconds ?? 5 * 60;
  }

  /**
   * Close and release sandbox resources
   */
  close() {
    if (this.sandbox) {
      try {
        this.sandbox.stop();
      } catch (e) {
        logger.debug('Failed to stop sandbox:', e);
      }
    }
  }

  /**
   * Ensure sandbox instance exists
   */
  protected ensureSandbox = async () => {
    if (this.sandbox) {
      return this.sandbox;
    }

    this.sandbox = await Sandbox.create({
      input: {
        templateName: this.templateName,
        sandboxIdleTimeoutSeconds: this.sandboxIdleTimeoutSeconds,
      },
      templateType: this.templateType,
      config: this.config,
    });

    this.sandboxId = this.sandbox.sandboxId || '';
    await this.sandbox.waitUntilRunning();

    return this.sandbox;
  };

  /**
   * Run operation in sandbox with auto-retry
   */
  protected runInSandbox = async <T>(callback: (sb: Sandbox) => Promise<T>) => {
    let sb = await this.ensureSandbox();

    try {
      return await callback(sb);
    } catch (e) {
      try {
        logger.debug('Run in sandbox failed, trying to re-create sandbox:', e);
        this.sandbox = null;
        sb = await this.ensureSandbox();
        return await callback(sb);
      } catch (e2) {
        logger.debug('Re-created sandbox run failed:', e2);
        throw e2;
      }
    }
  };
}

/**
 * Code Interpreter ToolSet
 * 代码解释器沙箱工具集
 *
 * Provides code execution, file operations, and process management capabilities.
 */
export class CodeInterpreterToolSet extends SandboxToolSet {
  constructor(options: {
    templateName: string;
    config?: Config;
    sandboxIdleTimeoutSeconds?: number;
  }) {
    super({
      templateName: options.templateName,
      templateType: TemplateType.CODE_INTERPRETER,
      sandboxIdleTimeoutSeconds: options.sandboxIdleTimeoutSeconds,
      config: options.config,
    });

    // Initialize tools
    this._tools = this._createTools();
  }

  private _createTools(): Tool[] {
    return [
      // Health Check
      createTool({
        name: 'health',
        description:
          'Check the health status of the code interpreter sandbox. Returns status="ok" if the sandbox is running normally.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.checkHealth(),
      }),

      // Code Execution
      createTool({
        name: 'run_code',
        description:
          'Execute code in a secure isolated sandbox environment. Supports Python and JavaScript languages. Can specify context_id to execute in an existing context, preserving variable state.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to execute' },
            language: {
              type: 'string',
              description: 'Programming language (python or javascript)',
              default: 'python',
            },
            timeout: {
              type: 'integer',
              description: 'Execution timeout in seconds',
              default: 60,
            },
            context_id: {
              type: 'string',
              description: 'Context ID for stateful execution',
            },
          },
          required: ['code'],
        },
        func: async (args: unknown) => {
          const { code, language, timeout, context_id } = args as {
            code: string;
            language?: string;
            timeout?: number;
            context_id?: string;
          };
          return this.runCode(code, language, timeout, context_id);
        },
      }),

      // Context Management
      createTool({
        name: 'list_contexts',
        description:
          'List all created execution contexts. Contexts preserve code execution state like variables and imported modules.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.listContexts(),
      }),

      createTool({
        name: 'create_context',
        description:
          'Create a new execution context for stateful code execution. Returns context_id for subsequent run_code calls.',
        parameters: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Programming language',
              default: 'python',
            },
            cwd: {
              type: 'string',
              description: 'Working directory',
              default: '/home/user',
            },
          },
        },
        func: async (args: unknown) => {
          const { language, cwd } = args as { language?: string; cwd?: string };
          return this.createContext(language, cwd);
        },
      }),

      createTool({
        name: 'delete_context',
        description:
          'Delete a specific execution context and release related resources.',
        parameters: {
          type: 'object',
          properties: {
            context_id: {
              type: 'string',
              description: 'Context ID to delete',
            },
          },
          required: ['context_id'],
        },
        func: async (args: unknown) => {
          const { context_id } = args as { context_id: string };
          return this.deleteContext(context_id);
        },
      }),

      // File Operations
      createTool({
        name: 'read_file',
        description:
          'Read the content of a file at the specified path in the sandbox.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
          },
          required: ['path'],
        },
        func: async (args: unknown) => {
          const { path } = args as { path: string };
          return this.readFile(path);
        },
      }),

      createTool({
        name: 'write_file',
        description:
          'Write content to a file at the specified path in the sandbox.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' },
            mode: {
              type: 'string',
              description: 'File permission mode',
              default: '644',
            },
            encoding: {
              type: 'string',
              description: 'File encoding',
              default: 'utf-8',
            },
          },
          required: ['path', 'content'],
        },
        func: async (args: unknown) => {
          const { path, content, mode, encoding } = args as {
            path: string;
            content: string;
            mode?: string;
            encoding?: string;
          };
          return this.writeFile(path, content, mode, encoding);
        },
      }),

      // File System Operations
      createTool({
        name: 'file_system_list',
        description:
          'List the contents of a directory in the sandbox, including files and subdirectories.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path',
              default: '/',
            },
            depth: {
              type: 'integer',
              description: 'Traversal depth',
            },
          },
        },
        func: async (args: unknown) => {
          const { path, depth } = args as { path?: string; depth?: number };
          return this.fileSystemList(path, depth);
        },
      }),

      createTool({
        name: 'file_system_stat',
        description: 'Get detailed status information of a file or directory.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to stat' },
          },
          required: ['path'],
        },
        func: async (args: unknown) => {
          const { path } = args as { path: string };
          return this.fileSystemStat(path);
        },
      }),

      createTool({
        name: 'file_system_mkdir',
        description: 'Create a directory in the sandbox.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to create' },
            parents: {
              type: 'boolean',
              description: 'Create parent directories',
              default: true,
            },
            mode: {
              type: 'string',
              description: 'Directory permission mode',
              default: '0755',
            },
          },
          required: ['path'],
        },
        func: async (args: unknown) => {
          const { path, parents, mode } = args as {
            path: string;
            parents?: boolean;
            mode?: string;
          };
          return this.fileSystemMkdir(path, parents, mode);
        },
      }),

      createTool({
        name: 'file_system_move',
        description: 'Move or rename a file/directory.',
        parameters: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path' },
          },
          required: ['source', 'destination'],
        },
        func: async (args: unknown) => {
          const { source, destination } = args as {
            source: string;
            destination: string;
          };
          return this.fileSystemMove(source, destination);
        },
      }),

      createTool({
        name: 'file_system_remove',
        description: 'Delete a file or directory.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to delete' },
          },
          required: ['path'],
        },
        func: async (args: unknown) => {
          const { path } = args as { path: string };
          return this.fileSystemRemove(path);
        },
      }),

      // Process Management
      createTool({
        name: 'process_exec_cmd',
        description:
          'Execute a shell command in the sandbox. Suitable for running system tools, installing packages, etc.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            cwd: {
              type: 'string',
              description: 'Working directory',
              default: '/home/user',
            },
            timeout: {
              type: 'integer',
              description: 'Execution timeout in seconds',
              default: 30,
            },
          },
          required: ['command'],
        },
        func: async (args: unknown) => {
          const { command, cwd, timeout } = args as {
            command: string;
            cwd?: string;
            timeout?: number;
          };
          return this.processExecCmd(command, cwd, timeout);
        },
      }),

      createTool({
        name: 'process_list',
        description: 'List all running processes in the sandbox.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.processList(),
      }),

      createTool({
        name: 'process_kill',
        description: 'Terminate a specific process.',
        parameters: {
          type: 'object',
          properties: {
            pid: { type: 'string', description: 'Process ID to kill' },
          },
          required: ['pid'],
        },
        func: async (args: unknown) => {
          const { pid } = args as { pid: string };
          return this.processKill(pid);
        },
      }),
    ];
  }

  // Tool implementations

  checkHealth = async () => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;

      return ciSandbox.checkHealth();
    });
  };

  runCode = async (
    code: string,
    language?: string,
    timeout?: number,
    contextId?: string,
  ) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const lang =
        language === 'javascript' ?
          CodeLanguage.JAVASCRIPT
        : CodeLanguage.PYTHON;

      if (contextId) {
        const result = await ciSandbox.context.execute({
          code,
          contextId,
          language: lang,
          timeout: timeout ?? 60,
        });
        return {
          stdout: result?.stdout || '',
          stderr: result?.stderr || '',
          exit_code: result?.exitCode || 0,
          result,
        };
      }

      // Create temporary context
      const ctx = await ciSandbox.context.create({ language: lang });
      try {
        const result = await ctx.execute({
          code,
          timeout: timeout ?? 60,
        });
        return {
          stdout: result?.stdout || '',
          stderr: result?.stderr || '',
          exit_code: result?.exitCode || 0,
          result,
        };
      } finally {
        try {
          await ctx.delete();
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  };

  listContexts = async () => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const contexts = await ciSandbox.context.list();
      return { contexts };
    });
  };

  createContext = async (language?: string, cwd?: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const lang =
        language === 'javascript' ?
          CodeLanguage.JAVASCRIPT
        : CodeLanguage.PYTHON;
      const ctx = await ciSandbox.context.create({
        language: lang,
        cwd: cwd ?? '/home/user',
      });
      return {
        context_id: ctx.contextId,
        language: lang,
        cwd: cwd ?? '/home/user',
      };
    });
  };

  deleteContext = async (contextId: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.context.delete({ contextId });
      return { success: true, result };
    });
  };

  readFile = async (path: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const content = await ciSandbox.file.read({ path });
      return { path, content };
    });
  };

  writeFile = async (
    path: string,
    content: string,
    mode?: string,
    encoding?: string,
  ) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.file.write({
        path,
        content,
        mode: mode ?? '644',
        encoding: encoding ?? 'utf-8',
      });
      return { path, success: true, result };
    });
  };

  fileSystemList = async (path?: string, depth?: number) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const entries = await ciSandbox.fileSystem.list({
        path: path ?? '/',
        depth,
      });
      return { path: path ?? '/', entries };
    });
  };

  fileSystemStat = async (path: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const stat = await ciSandbox.fileSystem.stat({ path });
      return { path, stat };
    });
  };

  fileSystemMkdir = async (path: string, parents?: boolean, mode?: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.fileSystem.mkdir({
        path,
        parents: parents ?? true,
        mode: mode ?? '0755',
      });
      return { path, success: true, result };
    });
  };

  fileSystemMove = async (source: string, destination: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.fileSystem.move({ source, destination });
      return { source, destination, success: true, result };
    });
  };

  fileSystemRemove = async (path: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.fileSystem.remove({ path });
      return { path, success: true, result };
    });
  };

  processExecCmd = async (command: string, cwd?: string, timeout?: number) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.process.cmd({
        command,
        cwd: cwd ?? '/home/user',
        timeout: timeout ?? 30,
      });
      return {
        command,
        stdout: result?.stdout || '',
        stderr: result?.stderr || '',
        exit_code: result?.exitCode || 0,
        result,
      };
    });
  };

  processList = () => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const processes = await ciSandbox.process.list();
      return { processes };
    });
  };

  processKill = async (pid: string) => {
    return this.runInSandbox(async (sb) => {
      const ciSandbox = sb as CodeInterpreterSandbox;
      const result = await ciSandbox.process.kill({ pid });
      return { pid, success: true, result };
    });
  };
}

/**
 * Browser ToolSet
 * 浏览器沙箱工具集
 *
 * Provides browser automation capabilities compatible with Playwright-style APIs.
 * Requires optional 'playwright' peer dependency for full functionality.
 */
export class BrowserToolSet extends SandboxToolSet {
  private playwrightBrowser: Browser | null = null;
  private currentPage: Page | null = null;
  private pages: Page[] = [];

  constructor(options: {
    templateName: string;
    config?: Config;
    sandboxIdleTimeoutSeconds?: number;
  }) {
    super({
      templateName: options.templateName,
      templateType: TemplateType.BROWSER,
      sandboxIdleTimeoutSeconds: options.sandboxIdleTimeoutSeconds,
      config: options.config,
    });

    // Initialize tools
    this._tools = this._createTools();
  }

  /**
   * Load Playwright dynamically (optional dependency)
   */
  private async loadPlaywright(): Promise<typeof import('playwright')> {
    try {
      return await import('playwright');
    } catch {
      throw new Error(
        'Playwright is not installed. Please install it with: npm install playwright',
      );
    }
  }

  /**
   * Ensure Playwright browser is connected
   */
  private async ensurePlaywright(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    // Ensure sandbox is running first
    const sb = await this.ensureSandbox();
    const browserSandbox = sb as BrowserSandbox;

    // Connect Playwright if not connected
    if (!this.playwrightBrowser) {
      const playwright = await this.loadPlaywright();
      const cdpUrl = browserSandbox.getCdpUrl();
      this.playwrightBrowser = await playwright.chromium.connectOverCDP(cdpUrl);

      // Get existing contexts/pages or create new ones
      const contexts = this.playwrightBrowser.contexts();
      if (contexts.length > 0) {
        const existingPages = contexts[0].pages();
        if (existingPages.length > 0) {
          this.pages = existingPages;
          this.currentPage = existingPages[0];
        } else {
          this.currentPage = await contexts[0].newPage();
          this.pages = [this.currentPage];
        }
      } else {
        throw new Error('No browser context available');
      }
    }

    if (!this.currentPage) {
      throw new Error('No page available');
    }

    return {
      browser: this.playwrightBrowser,
      page: this.currentPage,
    };
  }

  /**
   * Close Playwright browser connection
   */
  override close() {
    if (this.playwrightBrowser) {
      this.playwrightBrowser.close().catch((e) => {
        logger.debug('Failed to close Playwright browser:', e);
      });
      this.playwrightBrowser = null;
      this.currentPage = null;
      this.pages = [];
    }
    super.close();
  }

  private _createTools(): Tool[] {
    return [
      // Health Check
      createTool({
        name: 'health',
        description:
          'Check the health status of the browser sandbox. Returns status="ok" if the browser is running normally.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.checkHealth(),
      }),

      // Navigation
      createTool({
        name: 'browser_navigate',
        description:
          'Navigate to the specified URL. This is the first step in browser automation.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
          },
          required: ['url'],
        },
        func: async (args: unknown) => {
          const { url } = args as { url: string };
          return this.browserNavigate(url);
        },
      }),

      createTool({
        name: 'browser_navigate_back',
        description:
          "Go back to the previous page, equivalent to clicking the browser's back button.",
        parameters: { type: 'object', properties: {} },
        func: async () => this.browserNavigateBack(),
      }),

      // Page Info
      createTool({
        name: 'browser_snapshot',
        description:
          'Get the HTML snapshot and title of the current page. Useful for analyzing page structure.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.browserSnapshot(),
      }),

      createTool({
        name: 'browser_take_screenshot',
        description:
          'Capture a screenshot of the current page, returns base64 encoded image data.',
        parameters: {
          type: 'object',
          properties: {
            full_page: {
              type: 'boolean',
              description: 'Capture full page instead of viewport',
              default: false,
            },
            type: {
              type: 'string',
              description: 'Image format (png or jpeg)',
              default: 'png',
            },
          },
        },
        func: async (args: unknown) => {
          const { full_page, type } = args as {
            full_page?: boolean;
            type?: string;
          };
          return this.browserTakeScreenshot(full_page, type);
        },
      }),

      // Interaction
      createTool({
        name: 'browser_click',
        description:
          'Click an element matching the selector on the page. Supports CSS selectors, text selectors, XPath, etc.',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector',
            },
          },
          required: ['selector'],
        },
        func: async (args: unknown) => {
          const { selector } = args as { selector: string };
          return this.browserClick(selector);
        },
      }),

      createTool({
        name: 'browser_fill',
        description:
          'Fill a form input with a value. Clears existing content first.',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Input element selector',
            },
            value: {
              type: 'string',
              description: 'Value to fill',
            },
          },
          required: ['selector', 'value'],
        },
        func: async (args: unknown) => {
          const { selector, value } = args as {
            selector: string;
            value: string;
          };
          return this.browserFill(selector, value);
        },
      }),

      createTool({
        name: 'browser_type',
        description:
          'Type text character by character in an element. Triggers keydown, keypress, keyup events.',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Input element selector',
            },
            text: {
              type: 'string',
              description: 'Text to type',
            },
          },
          required: ['selector', 'text'],
        },
        func: async (args: unknown) => {
          const { selector, text } = args as { selector: string; text: string };
          return this.browserType(selector, text);
        },
      }),

      createTool({
        name: 'browser_hover',
        description:
          'Hover the mouse over an element. Commonly used to trigger hover menus or tooltips.',
        parameters: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Element selector',
            },
          },
          required: ['selector'],
        },
        func: async (args: unknown) => {
          const { selector } = args as { selector: string };
          return this.browserHover(selector);
        },
      }),

      // Advanced
      createTool({
        name: 'browser_evaluate',
        description:
          'Execute JavaScript code in the page context and return the result.',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'JavaScript expression to evaluate',
            },
          },
          required: ['expression'],
        },
        func: async (args: unknown) => {
          const { expression } = args as { expression: string };
          return this.browserEvaluate(expression);
        },
      }),

      createTool({
        name: 'browser_wait_for',
        description: 'Wait for the specified time in milliseconds.',
        parameters: {
          type: 'object',
          properties: {
            timeout: {
              type: 'number',
              description: 'Time to wait in milliseconds',
            },
          },
          required: ['timeout'],
        },
        func: async (args: unknown) => {
          const { timeout } = args as { timeout: number };
          return this.browserWaitFor(timeout);
        },
      }),

      // Tab Management
      createTool({
        name: 'browser_tabs_list',
        description: 'List all open browser tabs.',
        parameters: { type: 'object', properties: {} },
        func: async () => this.browserTabsList(),
      }),

      createTool({
        name: 'browser_tabs_new',
        description: 'Create a new browser tab.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Initial URL for the new tab',
            },
          },
        },
        func: async (args: unknown) => {
          const { url } = args as { url?: string };
          return this.browserTabsNew(url);
        },
      }),

      createTool({
        name: 'browser_tabs_select',
        description: 'Switch to the tab at the specified index.',
        parameters: {
          type: 'object',
          properties: {
            index: {
              type: 'integer',
              description: 'Tab index (starting from 0)',
            },
          },
          required: ['index'],
        },
        func: async (args: unknown) => {
          const { index } = args as { index: number };
          return this.browserTabsSelect(index);
        },
      }),
    ];
  }

  // Tool implementations using Playwright

  checkHealth = async () => {
    return this.runInSandbox(async (sb) => {
      const browserSandbox = sb as BrowserSandbox;
      return browserSandbox.checkHealth();
    });
  };

  browserNavigate = async (url: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.goto(url, { timeout: 30000 });
      return {
        url,
        success: true,
        title: await page.title(),
      };
    } catch (error) {
      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserNavigateBack = async () => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.goBack({ timeout: 30000 });
      return {
        success: true,
        url: page.url(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserSnapshot = async () => {
    try {
      const { page } = await this.ensurePlaywright();
      const [title, content] = await Promise.all([page.title(), page.content()]);
      return {
        html: content,
        title,
        url: page.url(),
      };
    } catch (error) {
      return {
        html: '',
        title: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserTakeScreenshot = async (fullPage?: boolean, type?: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      const buffer = await page.screenshot({
        fullPage: fullPage ?? false,
        type: (type as 'png' | 'jpeg') ?? 'png',
      });
      return {
        screenshot: buffer.toString('base64'),
        format: type ?? 'png',
        full_page: fullPage ?? false,
      };
    } catch (error) {
      return {
        screenshot: '',
        format: type ?? 'png',
        full_page: fullPage ?? false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserClick = async (selector: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.click(selector, { timeout: 10000 });
      return {
        selector,
        success: true,
      };
    } catch (error) {
      return {
        selector,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserFill = async (selector: string, value: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.fill(selector, value);
      return {
        selector,
        value,
        success: true,
      };
    } catch (error) {
      return {
        selector,
        value,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserType = async (selector: string, text: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.type(selector, text);
      return {
        selector,
        text,
        success: true,
      };
    } catch (error) {
      return {
        selector,
        text,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserHover = async (selector: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.hover(selector);
      return {
        selector,
        success: true,
      };
    } catch (error) {
      return {
        selector,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserEvaluate = async (expression: string) => {
    try {
      const { page } = await this.ensurePlaywright();
      // Create a function from the expression string
      const fn = new Function(`return (${expression})`) as () => unknown;
      const result = await page.evaluate(fn);
      return {
        result,
        success: true,
      };
    } catch (error) {
      return {
        result: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserWaitFor = async (timeout: number) => {
    try {
      const { page } = await this.ensurePlaywright();
      await page.waitForTimeout(timeout);
      return { success: true, waited_ms: timeout };
    } catch (error) {
      return {
        success: false,
        waited_ms: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserTabsList = async () => {
    try {
      await this.ensurePlaywright();
      return {
        tabs: this.pages.map((p, i) => ({
          index: i,
          url: p.url(),
          active: p === this.currentPage,
        })),
        count: this.pages.length,
      };
    } catch (error) {
      return {
        tabs: [],
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserTabsNew = async (url?: string) => {
    try {
      const { browser } = await this.ensurePlaywright();
      const contexts = browser.contexts();
      if (contexts.length === 0) {
        throw new Error('No browser context available');
      }
      const newPage = await contexts[0].newPage();
      this.pages.push(newPage);
      this.currentPage = newPage;

      if (url) {
        await newPage.goto(url, { timeout: 30000 });
      }

      return {
        success: true,
        index: this.pages.length - 1,
        url: url ?? '',
      };
    } catch (error) {
      return {
        success: false,
        url: url ?? '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  browserTabsSelect = async (index: number) => {
    try {
      await this.ensurePlaywright();
      if (index < 0 || index >= this.pages.length) {
        throw new Error(`Invalid tab index: ${index}`);
      }
      this.currentPage = this.pages[index];
      return {
        success: true,
        index,
        url: this.currentPage.url(),
      };
    } catch (error) {
      return {
        success: false,
        index,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

/**
 * Create a sandbox toolset
 * 创建沙箱工具集
 */
export async function sandboxToolset(
  templateName: string,
  options?: {
    templateType?: TemplateType;
    config?: Config;
    sandboxIdleTimeoutSeconds?: number;
  },
) {
  const client = new SandboxClient();
  const template = await client.getTemplate({ name: templateName });

  const templateType = template.templateType;

  if (
    templateType === TemplateType.BROWSER ||
    templateType === TemplateType.AIO
  )
    return new BrowserToolSet({
      templateName,
      config: options?.config,
      sandboxIdleTimeoutSeconds: options?.sandboxIdleTimeoutSeconds,
    });
  else if (templateType === TemplateType.CODE_INTERPRETER)
    return new CodeInterpreterToolSet({
      templateName,
      config: options?.config,
      sandboxIdleTimeoutSeconds: options?.sandboxIdleTimeoutSeconds,
    });
  else throw Error(`Unsupported template type: ${templateType}`);
}
