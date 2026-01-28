/**
 * Custom Sandbox 模块的 E2E 测试
 *
 * Custom Sandbox 是一种使用自定义镜像创建 Sandbox 的方式。
 *
 * 测试覆盖:
 * - 创建 Custom Template
 * - 创建 Custom Sandbox
 * - 获取 Custom Sandbox
 * - 列举 Custom Sandboxes
 * - 停止 Custom Sandbox
 * - 删除 Custom Sandbox
 *
 * 注意:
 * - Custom Sandbox 需要指定容器镜像
 * - 测试用例设计参考 Python SDK 的 tests/e2e/test_sandbox_custom.py
 */

import {
  Sandbox,
  Template,
  TemplateType,
  TemplateNetworkMode,
  SandboxState,
  CustomSandbox,
} from '../../../src/sandbox';
import { ClientError } from '../../../src/utils/exception';
import type { TemplateCreateInput } from '../../../src/sandbox';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

describe('Custom Sandbox E2E Tests', () => {
  describe('Custom Sandbox Lifecycle', () => {
    let templateName: string;
    let createdSandboxId: string | undefined;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-custom-template');
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

    it('should create a Custom template with container configuration', async () => {
      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CUSTOM,
        description: 'E2E 测试 - Custom Template',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
        containerConfiguration: {
          image: 'registry.cn-hangzhou.aliyuncs.com/agentrun/python:3.12',
          command: ['python', '-m', 'http.server', '8080'],
          port: 8080,
        },
      };

      const template = await Template.create({ input: templateInput });

      expect(template).toBeDefined();
      expect(template.templateName).toBe(templateName);
      expect(template.templateType).toBe(TemplateType.CUSTOM);
    });

    it('should create a Custom sandbox', async () => {
      // 等待模板就绪
      await new Promise((resolve) => setTimeout(resolve, 15000));

      const sandbox = await Sandbox.create({
        templateName,
        sandboxIdleTimeoutInSeconds: 600,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox.state).toBeDefined();
      expect(sandbox.createdAt).toBeDefined();

      createdSandboxId = sandbox.sandboxId;
    });

    it('should get a Custom sandbox by ID with templateType', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({
        id: createdSandboxId,
        templateType: TemplateType.CUSTOM,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBe(createdSandboxId);
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox).toBeInstanceOf(CustomSandbox);
    });

    it('should get Custom sandbox base URL', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = (await Sandbox.get({
        id: createdSandboxId,
        templateType: TemplateType.CUSTOM,
      })) as CustomSandbox;

      const baseUrl = sandbox.getBaseUrl();
      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
      expect(baseUrl).toContain(createdSandboxId);
    });

    it('should list Custom sandboxes', async () => {
      const sandboxes = await Sandbox.list({
        templateName,
        templateType: TemplateType.CUSTOM,
      });

      expect(sandboxes).toBeDefined();
      expect(Array.isArray(sandboxes)).toBe(true);
      expect(sandboxes.length).toBeGreaterThan(0);

      // 验证包含我们创建的 sandbox
      const found = sandboxes.find((s) => s.sandboxId === createdSandboxId);
      expect(found).toBeDefined();
    });

    it('should wait until Custom sandbox is running', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({
        id: createdSandboxId,
        templateType: TemplateType.CUSTOM,
      });

      await sandbox.waitUntilRunning({
        timeoutSeconds: 120,
        intervalSeconds: 5,
      });

      // READY is an acceptable state (equivalent to RUNNING)
      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(
        sandbox.state!,
      );
    });

    it('should stop a Custom sandbox', async () => {
      if (!createdSandboxId) {
        throw new Error('No sandbox created for test');
      }

      const sandbox = await Sandbox.get({
        id: createdSandboxId,
        templateType: TemplateType.CUSTOM,
      });

      // 停止沙箱
      await sandbox.stop();

      // 验证状态
      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBe(createdSandboxId);
    });

    it('should delete a Custom sandbox', async () => {
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

  describe('CustomSandbox.createFromTemplate', () => {
    let templateName: string;
    let sandbox: CustomSandbox | undefined;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-custom-from-template');

      // 创建模板
      await Template.create({
        input: {
          templateName,
          templateType: TemplateType.CUSTOM,
          description: 'E2E 测试 - Custom from Template',
          cpu: 2.0,
          memory: 4096,
          diskSize: 512,
          sandboxIdleTimeoutInSeconds: 600,
          networkConfiguration: {
            networkMode: TemplateNetworkMode.PUBLIC,
          },
          containerConfiguration: {
            image: 'registry.cn-hangzhou.aliyuncs.com/agentrun/python:3.12',
            command: ['python', '-m', 'http.server', '8080'],
            port: 8080,
          },
        },
      });

      // 等待模板就绪
      await new Promise((resolve) => setTimeout(resolve, 15000));
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

    it('should create Custom sandbox using createFromTemplate', async () => {
      sandbox = await CustomSandbox.createFromTemplate(templateName, {
        sandboxIdleTimeoutInSeconds: 600,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox).toBeInstanceOf(CustomSandbox);
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
    });

    it('should get base URL from created sandbox', async () => {
      if (!sandbox) {
        throw new Error('No sandbox created for test');
      }

      const baseUrl = sandbox.getBaseUrl();
      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
      expect(baseUrl.length).toBeGreaterThan(0);
    });
  });

  describe('TemplateContainerConfiguration fields', () => {
    let templateName: string;

    beforeAll(async () => {
      templateName = generateUniqueName('e2e-custom-container-config');
    });

    afterAll(async () => {
      // 清理 Template
      try {
        await Template.delete({ name: templateName });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create template with new container configuration fields', async () => {
      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CUSTOM,
        description: 'E2E 测试 - Container Config Fields',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration: {
          networkMode: TemplateNetworkMode.PUBLIC,
        },
        containerConfiguration: {
          image: 'registry.cn-hangzhou.aliyuncs.com/agentrun/python:3.12',
          command: ['python', '-m', 'http.server', '8080'],
          // 新增的字段
          acrInstanceId: 'cri-test-instance-id',
          imageRegistryType: 'ACR',
          port: 8080,
        },
      };

      const template = await Template.create({ input: templateInput });

      expect(template).toBeDefined();
      expect(template.templateName).toBe(templateName);
      expect(template.templateType).toBe(TemplateType.CUSTOM);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent Custom sandbox', async () => {
      try {
        await Sandbox.get({
          id: 'non-existent-custom-sandbox-id',
          templateType: TemplateType.CUSTOM,
        });
        throw new Error('Expected ClientError');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientError);
      }
    });
  });
});
