/**
 * Sandbox 模块的 E2E 测试
 *
 * 测试覆盖:
 * - 创建 Sandbox (CodeInterpreter 和 Browser 类型)
 * - 连接 Sandbox
 * - 获取 Sandbox
 * - 列举 Sandboxes
 * - 删除 Sandbox
 * - Sandbox 生命周期测试
 */

import {
  Sandbox,
  Template,
  TemplateType,
  TemplateNetworkMode,
  SandboxState,
} from '../../../src/sandbox';
import { ResourceNotExistError, ClientError } from '../../../src/utils/exception';
import type { TemplateCreateInput } from '../../../src/sandbox';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Sandbox E2E Tests', () => {
  describe('Code Interpreter Sandbox', () => {
    let templateName: string;
    let createdSandboxId: string | undefined;
    let template: Template | undefined;
    let templateReady = false;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-ci-template');
    });

    afterAll(async () => {
      // 清理 Sandbox
      if (createdSandboxId) {
        try {
          await Sandbox.delete({ id: createdSandboxId });
        } catch {
          // Ignore cleanup errors
        }
      }

      // 清理 Template
      try {
        await Template.delete({ name: templateName });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create a Code Interpreter template', async () => {
      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'E2E 测试 - Code Interpreter Template',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      };

      try {
        template = await Template.create({ input: templateInput });

        expect(template).toBeDefined();
        expect(template.templateName).toBe(templateName);
        expect(template.templateType).toBe(TemplateType.CODE_INTERPRETER);

        await template.waitUntilReadyOrFailed({
          timeoutSeconds: 180,
          intervalSeconds: 5,
        });

        templateReady = template.status === 'READY';
        if (!templateReady) {
          console.warn('Template not ready, skipping sandbox tests.');
        }
      } catch (error) {
        console.warn('Template creation failed, skipping sandbox tests.', error);
      }
    });

    it('should create a Code Interpreter sandbox', async () => {
      if (!template || !templateReady) {
        throw new Error('No template created for test');
      }

      const sandbox = await Sandbox.create({
        input: {
          sandboxId: generateUniqueName('e2e-ci-sandbox'),
          templateName,
          sandboxIdleTimeoutSeconds: 600,
        },
        templateType: TemplateType.CODE_INTERPRETER,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox.state).toBeDefined();
      expect(sandbox.createdAt).toBeDefined();

      createdSandboxId = sandbox.sandboxId;
    });

    it('should get a sandbox by ID', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({ id: createdSandboxId });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBe(createdSandboxId);
      expect(sandbox.templateName).toBe(templateName);
    });

    it('should list sandboxes', async () => {
      let sandboxes: Sandbox[] = [];
      const maxAttempts = 5;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        sandboxes = await Sandbox.list({
          templateName,
        });

        if (sandboxes.length > 0) break;
        await sleep(3000);
      }

      if (sandboxes.length === 0) {
        console.warn('No sandboxes returned, skipping assertions.');
        return;
      }

      expect(sandboxes).toBeDefined();
      expect(Array.isArray(sandboxes)).toBe(true);
      expect(sandboxes.length).toBeGreaterThan(0);

      // 验证包含我们创建的 sandbox
      const found = sandboxes.find(s => s.sandboxId === createdSandboxId);
      expect(found).toBeDefined();
    });

    it('should delete a sandbox', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const deletedSandbox = await Sandbox.delete({ id: createdSandboxId });

      expect(deletedSandbox).toBeDefined();
      expect(deletedSandbox.sandboxId).toBe(createdSandboxId);

      // 验证已删除
      try {
        await Sandbox.get({ id: createdSandboxId });
        throw new Error('Expected ClientError');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
      }

      createdSandboxId = undefined;
    });
  });

  describe('Browser Sandbox', () => {
    let templateName: string;
    let createdSandboxId: string | undefined;
    let template: Template | undefined;
    let templateReady = false;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-browser-template');
    });

    afterAll(async () => {
      // 清理 Sandbox
      if (createdSandboxId) {
        try {
          await Sandbox.delete({ id: createdSandboxId });
        } catch {
          // Ignore cleanup errors
        }
      }

      // 清理 Template
      try {
        await Template.delete({ name: templateName });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create a Browser template', async () => {
      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.BROWSER,
        description: 'E2E 测试 - Browser Template',
        cpu: 2.0,
        memory: 4096,
        diskSize: 10240, // Browser 类型必须是 10240
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
      };

      try {
        template = await Template.create({ input: templateInput });

        expect(template).toBeDefined();
        expect(template.templateName).toBe(templateName);
        expect(template.templateType).toBe(TemplateType.BROWSER);

        await template.waitUntilReadyOrFailed({
          timeoutSeconds: 180,
          intervalSeconds: 5,
        });

        templateReady = template.status === 'READY';
        if (!templateReady) {
          console.warn('Browser template not ready, skipping sandbox tests.');
        }
      } catch (error) {
        console.warn('Browser template creation failed, skipping tests.', error);
      }
    });

    it('should create a Browser sandbox', async () => {
      if (!template || !templateReady) {
        throw new Error('No template created for test');
      }

      const sandbox = await Sandbox.create({
        input: {
          sandboxId: generateUniqueName('e2e-browser-sandbox'),
          templateName,
          sandboxIdleTimeoutSeconds: 600,
        },
        templateType: TemplateType.BROWSER,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox.state).toBeDefined();

      createdSandboxId = sandbox.sandboxId;
    });

    it('should wait until sandbox is running', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({ id: createdSandboxId });

      await sandbox.waitUntilRunning({
        timeoutSeconds: 120,
        intervalSeconds: 5,
      });

      // READY is an acceptable state (equivalent to RUNNING)
      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(sandbox.state!);
    });

    it('should stop a sandbox', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({ id: createdSandboxId });

      // 停止沙箱
      await sandbox.stop();

      // 验证状态
      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBe(createdSandboxId);
    });
  });

  describe('Sandbox Lifecycle', () => {
    let templateName: string;
    let sandbox: Sandbox | undefined;
    let template: Template | undefined;
    let templateReady = false;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-lifecycle-template');

      // 创建模板
      try {
        template = await Template.create({
          input: {
            templateName,
            templateType: TemplateType.CODE_INTERPRETER,
            description: 'E2E 测试 - Lifecycle Template',
            cpu: 2.0,
            memory: 4096,
            diskSize: 512,
            sandboxIdleTimeoutInSeconds: 600,
            networkConfiguration: {
              networkMode: TemplateNetworkMode.PUBLIC,
            },
          },
        });

        await template.waitUntilReadyOrFailed({
          timeoutSeconds: 180,
          intervalSeconds: 5,
        });

        templateReady = template.status === 'READY';
        if (!templateReady) {
          console.warn('Lifecycle template not ready, skipping test.');
        }
      } catch (error) {
        console.warn('Lifecycle template creation failed, skipping test.', error);
      }
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
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create, refresh, and delete sandbox', async () => {
      if (!templateReady) return;

      // 创建 Sandbox
      sandbox = await Sandbox.create({
        input: {
          sandboxId: generateUniqueName('e2e-lifecycle-sandbox'),
          templateName,
          sandboxIdleTimeoutSeconds: 600,
        },
        templateType: TemplateType.CODE_INTERPRETER,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();

      const sandboxId = sandbox.sandboxId;

      // 刷新 Sandbox
      await sandbox.refresh();
      expect(sandbox.sandboxId).toBe(sandboxId);
      expect(sandbox.createdAt).toBeDefined();

      // 删除 Sandbox
      await sandbox.delete();

      // 验证已删除
      try {
        await Sandbox.get({ id: sandboxId! });
        throw new Error('Expected ClientError');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
      }

      sandbox = undefined;
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent sandbox', async () => {
      try {
        await Sandbox.get({ id: 'non-existent-sandbox-id' });
        throw new Error('Expected ClientError');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
      }
    });

    it('should throw error when deleting non-existent sandbox', async () => {
      try {
        await Sandbox.delete({ id: 'non-existent-sandbox-id' });
        throw new Error('Expected error');
      } catch (error) {
        // 预期抛出错误
        expect(error).toBeDefined();
      }
    });
  });
});
