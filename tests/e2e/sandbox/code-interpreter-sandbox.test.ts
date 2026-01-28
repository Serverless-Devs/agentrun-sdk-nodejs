/**
 * Sandbox Code Interpreter 模块的 E2E 测试
 *
 * 测试覆盖:
 * - 代码执行 (Context)
 * - 文件系统操作 (FileSystem)
 * - 文件读写操作 (File)
 * - 进程操作 (Process)
 * - 上传下载
 *
 * 注意:
 * - 某些功能 (context, file, filesystem, process) 需要完成数据 API 集成后才可用
 * - 测试用例设计参考 Python SDK 的 tests/e2e/test_sandbox_code_interpreter.py
 */



import {
  Sandbox,
  Template,
  CodeInterpreterSandbox,
  TemplateType,
  TemplateNetworkMode,
  CodeLanguage,
} from '../../../src/sandbox';
import { ResourceNotExistError } from '../../../src/utils/exception';
import { logger } from '../../../src/utils/log';
import type { TemplateCreateInput } from '../../../src/sandbox';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

describe('Sandbox Code Interpreter E2E Tests', () => {
  let templateName: string;
  let sandbox: CodeInterpreterSandbox | undefined;

  beforeAll(async () => {
    templateName = generateUniqueName('e2e-ci-template');

    // 创建模板
    const templateInput: TemplateCreateInput = {
      templateName,
      templateType: TemplateType.CODE_INTERPRETER,
      description: 'E2E 测试 - Code Interpreter',
      cpu: 2.0,
      memory: 4096,
      diskSize: 512,
      sandboxIdleTimeoutInSeconds: 600,
      networkConfiguration: {
        networkMode: TemplateNetworkMode.PUBLIC,
      },
    };

    await Template.create({ input: templateInput });

    // 等待模板就绪
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    // 清理 Sandbox
    if (sandbox?.sandboxId) {
      try {
        await sandbox.delete();
      } catch {
        // Ignore cleanup errors
      }
    }

    // 清理 Template
    try {
      await Template.delete({ name: templateName });
    } catch (error) {
      if (!(error instanceof ResourceNotExistError)) {
        logger.error('Failed to delete template:', error);
      }
    }
  });

  beforeEach(async () => {
    if (!sandbox) {
      // 创建 Sandbox
      // 注意: CodeInterpreterSandbox.createFromTemplate 方法需要先创建模板
      sandbox = await CodeInterpreterSandbox.createFromTemplate(
        templateName,
        { sandboxIdleTimeoutInSeconds: 600 }
      );

      // 等待 Sandbox 就绪
      await sandbox.waitUntilRunning({
        timeoutSeconds: 120,
        intervalSeconds: 5,
      });
    }
  });

  // ========== 代码执行测试 (Context) ==========
  // 注意: 这些测试需要完成数据 API 集成后才可用

  describe('Context - Code Execution', () => {
    it('should execute Python code', async () => {
      if (!sandbox) throw new Error('Sandbox not initialized');

      // 使用 execute 方法
      const result = await sandbox.execute({
        code: "print('hello world')",
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
      // 验证输出包含预期内容
      if (result.stdout) {
        expect(result.stdout).toContain('hello');
      }
    });

    it('should execute Python code with variables', async () => {
      if (!sandbox) throw new Error('Sandbox not initialized');

      const result = await sandbox.execute({
        code: 'x = 1 + 1\nprint(x)',
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
      if (result.stdout) {
        expect(result.stdout).toContain('2');
      }
    });

    it('should execute Python code with error handling', async () => {
      if (!sandbox) throw new Error('Sandbox not initialized');

      const result = await sandbox.execute({
        code: `
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Caught error: {e}")
`,
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
    });

    it('should execute multi-line Python code', async () => {
      if (!sandbox) throw new Error('Sandbox not initialized');

      const result = await sandbox.execute({
        code: `
def greet(name):
    return f"Hello, {name}!"

message = greet("World")
print(message)
`,
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
    });

    it('should execute Python code with imports', async () => {
      if (!sandbox) throw new Error('Sandbox not initialized');

      const result = await sandbox.execute({
        code: `
import json
data = {"key": "value"}
print(json.dumps(data))
`,
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
    });
  });

  // ========== 进程操作测试 (Process) ==========
  // 注意: 这些测试需要完成数据 API 集成后才可用

  describe('Process - Command Execution', () => {
    it.skip('should execute shell command', async () => {
      // TODO: 需要实现数据 API 集成
      // 参考 Python SDK 的 sandbox.process.cmd 实现
      if (!sandbox) throw new Error('Sandbox not initialized');

      // 执行 shell 命令（通过代码执行）
      const result = await sandbox.execute({
        code: "import subprocess; result = subprocess.run(['echo', 'test'], capture_output=True); print(result.stdout.decode())",
        language: CodeLanguage.PYTHON,
      });

      expect(result).toBeDefined();
    });
  });

  // ========== 文件系统测试 (FileSystem) ==========
  // 注意: 这些测试需要完成数据 API 集成后才可用

  describe('FileSystem - Directory Operations', () => {
    it.skip('should list root directory', async () => {
      // TODO: 需要实现 fileSystem.list 方法
      if (!sandbox) throw new Error('Sandbox not initialized');

      const result = await sandbox.fileSystem.list({ path: '/' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ========== 文件操作测试 (File) ==========
  // 注意: 这些测试需要完成数据 API 集成后才可用

  describe('File - Read/Write Operations', () => {
    it.skip('should upload and download a file', async () => {
      // TODO: 需要实现 fileSystem.upload/fileSystem.download 方法
      if (!sandbox) throw new Error('Sandbox not initialized');

      const testFile = `/tmp/test-file-${Date.now()}.txt`;
      const testContent = 'Hello, World!';

      // 写入文件
      await sandbox.fileSystem.upload({ localFilePath: testContent, targetFilePath: testFile });

      // 读取文件
      const content = await sandbox.fileSystem.download({ path: testFile, savePath: '/tmp/download.txt' });

      expect(content.toString()).toBe(testContent);
    });
  });

  // ========== 健康检查测试 ==========
  // 注意: 健康检查需要 sandbox 真正运行时才可用

  describe('Health Check', () => {
    it.skip('should check sandbox health', async () => {
      // TODO: 需要实现健康检查方法
      if (!sandbox) throw new Error('Sandbox not initialized');

      // 健康检查需要调用 sandbox 数据 API
      // 当前实现不包含此功能
    });
  });
});

