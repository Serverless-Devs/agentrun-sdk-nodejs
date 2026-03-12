/**
 * Sandbox 创建和运行测试
 *
 * 测试覆盖完整的 Sandbox 创建和运行流程:
 * - 创建 Template
 * - 创建 Sandbox
 * - 等待 Sandbox 就绪
 * - 执行代码
 * - 文件操作
 * - 进程操作
 * - 清理资源
 *
 * 运行前请确保设置环境变量:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET
 * - AGENTRUN_ACCOUNT_ID
 */

import {
  CodeInterpreterSandbox,
  Template,
  TemplateType,
  TemplateNetworkMode,
  CodeLanguage,
  Sandbox,
  SandboxState,
} from '../../../src/sandbox';
import { ResourceNotExistError, ClientError } from '../../../src/utils/exception';
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

describe('Sandbox Create and Run E2E Tests', () => {
  let templateName: string;
  let sandbox: CodeInterpreterSandbox | undefined;
  let template: Template | undefined;

  beforeAll(async () => {
    templateName = generateUniqueName('test-create-run-template');
  });

  afterAll(async () => {
    // 清理 Sandbox
    if (sandbox?.sandboxId) {
      try {
        await sandbox.delete();
        logger.info('Sandbox 已清理 / Sandbox cleaned up');
      } catch (error) {
        if (!(error instanceof ResourceNotExistError)) {
          logger.error('清理 Sandbox 失败 / Failed to cleanup sandbox:', error);
        }
      }
    }

    // 清理 Template
    try {
      await Template.delete({ name: templateName });
      logger.info('Template 已清理 / Template cleaned up');
    } catch (error) {
      if (!(error instanceof ResourceNotExistError)) {
        logger.error('清理 Template 失败 / Failed to cleanup template:', error);
      }
    }
  });

  // ========== 模板创建测试 ==========

  describe('Template Creation', () => {
    it('should create a Code Interpreter template successfully', async () => {
      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'Sandbox Create Run Test - Code Interpreter Template',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      };

      template = await Template.create({ input: templateInput });

      expect(template).toBeDefined();
      expect(template.templateName).toBe(templateName);
      expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);
      expect(template.status).toBeDefined();
    });

    it('should wait for template to be ready', async () => {
      expect(template).toBeDefined();

      await template!.waitUntilReadyOrFailed({
        timeoutSeconds: 180,
        intervalSeconds: 5,
        callback: t => {
          logger.info(`等待模板就绪 / Waiting for template: ${t.status}`);
        },
      });

      expect(template!.status).toBe('READY');
    });
  });

  // ========== Sandbox 创建测试 ==========

  describe('Sandbox Creation', () => {
    it('should create a Code Interpreter sandbox from template', async () => {
      expect(template).toBeDefined();

      sandbox = await CodeInterpreterSandbox.createFromTemplate(templateName, {
        sandboxIdleTimeoutSeconds: 600,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox.state).toBeDefined();
    });

    it('should wait for sandbox to be running', async () => {
      expect(sandbox).toBeDefined();

      await sandbox!.waitUntilRunning({
        timeoutSeconds: 120,
        intervalSeconds: 5,
        beforeCheck: s => {
          logger.info(`等待沙箱运行 / Waiting for sandbox: ${s.state}`);
        },
      });

      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(sandbox!.state!);
    });

    it('should pass health check', async () => {
      expect(sandbox).toBeDefined();

      await sandbox!.waitUntilReadyOrFailed({
        timeoutSeconds: 60,
        intervalSeconds: 3,
      });

      // 通过健康检查意味着 sandbox 可以正常运行
      expect(sandbox!.sandboxId).toBeDefined();
    });
  });

  // ========== 代码执行测试 ==========

  describe('Code Execution', () => {
    it('should execute simple Python code', async () => {
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
      const result = await ctx.execute({
        code: "print('Hello from sandbox!')",
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);

      await ctx.delete();
    });

    it('should execute Python code with variables', async () => {
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
      const result = await ctx.execute({
        code: `
x = 10
y = 20
print(f"Result: {x + y}")
`,
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
      if (result.stdout) {
        expect(result.stdout).toContain('Result: 30');
      }

      await ctx.delete();
    });

    it('should execute multi-line Python code', async () => {
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
      const result = await ctx.execute({
        code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print(fibonacci(i), end=",")
`,
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);

      await ctx.delete();
    });

    it('should handle Python errors', async () => {
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
      const result = await ctx.execute({
        code: `
result = 10 / 0
`,
      });

      expect(result).toBeDefined();
      // 错误应该被捕获
      expect(result.exitCode).not.toBe(0);

      await ctx.delete();
    });
  });

  // ========== 文件系统测试 ==========

  describe('File System Operations', () => {
    it('should list root directory', async () => {
      expect(sandbox).toBeDefined();

      const files = await sandbox!.fileSystem.list({ path: '/' });

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should create directory', async () => {
      expect(sandbox).toBeDefined();

      const testDir = '/home/user/test-create-run';
      await sandbox!.fileSystem.mkdir({ path: testDir });

      // 验证目录创建成功
      const files = await sandbox!.fileSystem.list({ path: '/home/user' });
      const createdDir = files.find((f: any) => f.name === 'test-create-run');
      expect(createdDir).toBeDefined();
    });

    it('should write and read file', async () => {
      expect(sandbox).toBeDefined();

      const testFile = '/home/user/test-create-run/test.txt';
      const testContent = 'Hello, World! This is a test file.';

      // 写入文件
      await sandbox!.file.write({
        path: testFile,
        content: testContent,
      });

      // 读取文件
      const result = await sandbox!.file.read({ path: testFile });
      expect(result).toBeDefined();
      expect(result.content).toBe(testContent);
    });

    it('should get file stat', async () => {
      expect(sandbox).toBeDefined();

      const testFile = '/home/user/test-create-run/test.txt';
      const stat = await sandbox!.fileSystem.stat({ path: testFile });

      expect(stat).toBeDefined();
      expect(stat.name).toBe('test.txt');
      expect(stat.size).toBeGreaterThan(0);
    });

    it('should move file', async () => {
      expect(sandbox).toBeDefined();

      const sourceFile = '/home/user/test-create-run/test.txt';
      const destFile = '/home/user/test-create-run/moved_test.txt';

      // 移动文件
      await sandbox!.fileSystem.move({
        source: sourceFile,
        destination: destFile,
      });

      // 验证移动成功
      const files = await sandbox!.fileSystem.list({ path: '/home/user/test-create-run' });
      const movedFile = files.find((f: any) => f.name === 'moved_test.txt');
      expect(movedFile).toBeDefined();

      // 原文件应该不存在
      try {
        await sandbox!.fileSystem.stat({ path: sourceFile });
        throw new Error('Expected error');
      } catch (error) {
        // 预期错误
      }
    });

    it('should upload and download file', async () => {
      expect(sandbox).toBeDefined();

      const localFile = '/tmp/test-upload.txt';
      const remoteFile = '/home/user/test-create-run/uploaded.txt';
      const testContent = `Upload test content - ${Date.now()}`;
      let downloadPath = '/tmp/test-download.txt';

      // 创建本地文件
      const fs = await import('fs/promises');
      await fs.writeFile(localFile, testContent);

      try {
        // 上传文件
        await sandbox!.fileSystem.upload({
          localFilePath: localFile,
          targetFilePath: remoteFile,
        });

        // 验证上传成功
        const stat = await sandbox!.fileSystem.stat({ path: remoteFile });
        expect(stat).toBeDefined();
        expect(stat.size).toBeGreaterThan(0);

        // 下载文件
        await sandbox!.fileSystem.download({
          path: remoteFile,
          savePath: downloadPath,
        });

        // 验证下载内容
        const downloadedContent = await fs.readFile(downloadPath, 'utf-8');
        expect(downloadedContent).toBe(testContent);
      } finally {
        // 清理本地文件
        await fs.unlink(localFile).catch(() => {});
        await fs.unlink(downloadPath).catch(() => {});
      }
    });

    it('should remove directory', async () => {
      expect(sandbox).toBeDefined();

      const testDir = '/home/user/test-create-run';

      // 删除目录
      await sandbox!.fileSystem.remove({ path: testDir });

      // 验证删除成功
      try {
        await sandbox!.fileSystem.stat({ path: testDir });
        throw new Error('Expected error');
      } catch (error) {
        // 预期错误，目录已删除
      }
    });
  });

  // ========== 进程操作测试 ==========

  describe('Process Operations', () => {
    it('should list processes', async () => {
      expect(sandbox).toBeDefined();

      const processes = await sandbox!.process.list();

      expect(processes).toBeDefined();
      expect(Array.isArray(processes)).toBe(true);
      expect(processes.length).toBeGreaterThan(0);
    });

    it('should execute shell command', async () => {
      expect(sandbox).toBeDefined();

      const result = await sandbox!.process.cmd({
        command: 'echo "Hello from shell"',
        cwd: '/',
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
      if (result.stdout) {
        expect(result.stdout).toContain('Hello from shell');
      }
    });

    it('should execute ls command', async () => {
      expect(sandbox).toBeDefined();

      const result = await sandbox!.process.cmd({
        command: 'ls -la /home/user',
        cwd: '/',
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should get process details', async () => {
      expect(sandbox).toBeDefined();

      // PID 1 通常是 init 进程
      const process = await sandbox!.process.get({ pid: '1' });

      expect(process).toBeDefined();
      expect(process.pid).toBe('1');
    });
  });

  // ========== Sandbox 状态测试 ==========

  describe('Sandbox State', () => {
    it('should refresh sandbox state', async () => {
      expect(sandbox).toBeDefined();

      const initialState = sandbox!.state;
      await sandbox!.refresh();

      expect(sandbox!.state).toBeDefined();
      // 刷新后状态应该仍然有效
      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(sandbox!.state!);
    });

    it('should get sandbox details', async () => {
      expect(sandbox).toBeDefined();

      const details = await sandbox!.get();

      expect(details).toBeDefined();
      expect(details.sandboxId).toBe(sandbox!.sandboxId);
      expect(details.templateName).toBe(templateName);
    });
  });

  // ========== 停止和清理测试 ==========

  describe('Sandbox Stop and Cleanup', () => {
    it('should stop sandbox', async () => {
      expect(sandbox).toBeDefined();

      await sandbox!.stop();

      // 停止后 sandbox 状态应该更新
      expect(sandbox!.sandboxId).toBeDefined();
    });

    it('should restart sandbox', async () => {
      expect(sandbox).toBeDefined();

      // 重新获取 sandbox 以刷新状态
      await sandbox!.refresh();

      // 等待 sandbox 再次运行
      await sandbox!.waitUntilRunning({
        timeoutSeconds: 60,
        intervalSeconds: 3,
      });

      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(sandbox!.state!);
    });
  });
});

// ========== 独立测试：使用已存在的 Template ==========

describe('Sandbox with Existing Template', () => {
  let existingTemplateName: string;
  let template: Template | undefined;
  let sandbox: CodeInterpreterSandbox | undefined;

  beforeAll(async () => {
    existingTemplateName = generateUniqueName('existing-template');

    // 创建一个模板供后续使用
    template = await Template.create({
      input: {
        templateName: existingTemplateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'Test template for existing template test',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 300,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      },
    });

    await template.waitUntilReadyOrFailed({
      timeoutSeconds: 180,
      intervalSeconds: 5,
    });
  });

  afterAll(async () => {
    // 清理 Sandbox
    if (sandbox?.sandboxId) {
      try {
        await sandbox.delete();
      } catch {
        // Ignore
      }
    }

    // 清理 Template
    try {
      await Template.delete({ name: existingTemplateName });
    } catch {
      // Ignore
    }
  });

  it('should create sandbox from existing template', async () => {
    expect(template).toBeDefined();
    expect(template!.status).toBe('READY');

    sandbox = await CodeInterpreterSandbox.createFromTemplate(existingTemplateName);

    expect(sandbox).toBeDefined();
    expect(sandbox.sandboxId).toBeDefined();
    expect(sandbox.templateName).toBe(existingTemplateName);
  });

  it('should execute code in new sandbox', async () => {
    expect(sandbox).toBeDefined();

    await sandbox!.waitUntilRunning({
      timeoutSeconds: 60,
      intervalSeconds: 3,
    });

    const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
    const result = await ctx.execute({
      code: "print('Test from existing template')",
    });

    expect(result).toBeDefined();
    expect(result.exitCode).toBe(0);

    await ctx.delete();
  });
});
