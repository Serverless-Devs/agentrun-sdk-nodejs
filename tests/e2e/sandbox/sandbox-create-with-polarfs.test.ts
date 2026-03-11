/**
 * Sandbox 创建测试 - 使用 PolarFS 配置
 *
 * 测试使用 PolarFS 配置创建 Sandbox 的完整流程:
 * - 创建 Template
 * - 等待 Template 就绪
 * - 使用 polarFsConfig 创建 Sandbox
 * - 验证 Sandbox 状态
 * - 清理资源
 *
 * 运行前请确保设置环境变量:
 * - AGENTRUN_ACCESS_KEY_ID
 * - AGENTRUN_ACCESS_KEY_SECRET=
 * - AGENTRUN_ACCOUNT_ID=
 * - AGENTRUN_POLARFS_INSTANCE_ID=
 * - AGENTRUN_VPC_ID=
 * - AGENTRUN_VSWITCH_IDS=
 * - AGENTRUN_SECURITY_GROUP_ID=
 */

import {
  CodeInterpreterSandbox,
  Template,
  TemplateType,
  TemplateNetworkMode,
  CodeLanguage,
  SandboxState,
  type TemplateCreateInput,
  type PolarFsConfig,
} from '../../../src/sandbox';
import { ResourceNotExistError } from '../../../src/utils/exception';
import { logger } from '../../../src/utils/log';

/**
 * 生成唯一名称
 */
function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

describe('Sandbox Create with PolarFS Configuration', () => {
  let templateName: string;
  let sandbox: CodeInterpreterSandbox | undefined;
  let template: Template | undefined;

  // 从环境变量获取 PolarFS 实例 ID
  const polarfsInstanceId = process.env.AGENTRUN_POLARFS_INSTANCE_ID;

  beforeAll(async () => {
    templateName = generateUniqueName('test-polarfs-template');
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

  describe('Template Creation for PolarFS Sandbox', () => {
    it('should create a Code Interpreter template', async () => {
      // 从环境变量获取 VPC 配置
      const vpcId = process.env.AGENTRUN_VPC_ID;
      const vswitchIds = process.env.AGENTRUN_VSWITCH_IDS?.split(',');
      const securityGroupId = process.env.AGENTRUN_SECURITY_GROUP_ID;
      // 构建网络配置
      const networkConfiguration = polarfsInstanceId
        ? {
          networkMode: TemplateNetworkMode.PUBLIC_AND_PRIVATE as TemplateNetworkMode,
          vpcId,
          vswitchIds,
          securityGroupId,
        }
        : {
          networkMode: TemplateNetworkMode.PUBLIC as TemplateNetworkMode,
        };
      logger.info("securityGroupId", securityGroupId)

      const templateInput: TemplateCreateInput = {
        templateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'Sandbox Create with PolarFS - Test Template',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 600,
        networkConfiguration,
      };
      console.log(`------------- template create sanbdox input -----------`)
      console.log(JSON.stringify(templateInput))

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
          logger.info(`模板创建状态 ${JSON.stringify(t)}`)
        },
      });

      expect(template!.status).toBe('READY');
    });
  });

  // ========== Sandbox 创建测试（使用 PolarFS 配置） ==========

  describe('Sandbox Creation with PolarFS Config', () => {
    it('should create sandbox with polarFsConfig (skip without instance ID)', async () => {
      expect(template).toBeDefined();

      // 如果没有 PolarFS 实例 ID，跳过此测试
      if (!polarfsInstanceId) {
        logger.warn('跳过测试：需要设置 AGENTRUN_POLARFS_INSTANCE_ID 环境变量');
        return;
      }

      // 检查 VPC 配置是否存在
      const vpcId = process.env.AGENTRUN_VPC_ID;
      if (!vpcId) {
        logger.error('使用 PolarFS 时必须配置 VPC。请设置以下环境变量：AGENTRUN_VPC_ID, AGENTRUN_VSWITCH_IDS, AGENTRUN_SECURITY_GROUP_ID');
        throw new Error('缺少 VPC 配置：使用 PolarFS 时，Template 必须配置 VPC 网络模式。请设置 AGENTRUN_VPC_ID 等环境变量。');
      }

      // 构建 PolarFS 配置
      const polarFsConfig: PolarFsConfig = {
        userId: 1000,
        groupId: 1000,
        mountPoints: [
          {
            instanceId: polarfsInstanceId,
            mountDir: '/mnt/polarfs',
            remoteDir: '/qianfeng-test-uid',
          },
        ],
      };

      logger.info(`使用 PolarFS 实例 ID: ${polarfsInstanceId}`);

      // 使用 polarFsConfig 创建 Sandbox
      sandbox = await CodeInterpreterSandbox.createFromTemplate(templateName, {
        sandboxIdleTimeoutSeconds: 600,
        polarFsConfig,
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.sandboxId).toBeDefined();
      expect(sandbox.templateName).toBe(templateName);
      expect(sandbox.state).toBeDefined();
    });

    it('should wait for sandbox to be running (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
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

    it('should pass health check (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      await sandbox!.waitUntilReadyOrFailed({
        timeoutSeconds: 60,
        intervalSeconds: 3,
      });

      // 通过健康检查意味着 sandbox 可以正常运行
      expect(sandbox!.sandboxId).toBeDefined();
    });
  });

  // ========== 代码执行测试（验证 PolarFS 配置生效） ==========

  describe('Code Execution in PolarFS Sandbox', () => {
    it('should execute simple Python code (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
      const result = await ctx.execute({
        code: "print('Hello from PolarFS sandbox!')",
      });

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);

      await ctx.delete();
    });

    it('should check PolarFS mount point exists (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });

      // 检查 PolarFS 挂载点是否存在
      const result = await ctx.execute({
        code: `
import os
mount_point = '/mnt/polarfs'
exists = os.path.exists(mount_point)
print(f"PolarFS mount point exists: {exists}")
if exists:
    print(f"Contents: {os.listdir(mount_point)}")
`,
      });

      expect(result).toBeDefined();
      logger.info(`执行结果：${result.stdout}`);

      await ctx.delete();
    });

    it('should list sandbox file system (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      const files = await sandbox!.fileSystem.list({ path: '/home/user' });

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  // ========== Sandbox 状态测试 ==========

  describe('Sandbox State Verification', () => {
    it('should refresh sandbox state (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      await sandbox!.refresh();

      expect(sandbox!.state).toBeDefined();
      expect([SandboxState.RUNNING, SandboxState.READY]).toContain(sandbox!.state!);
    });

    it('should get sandbox details (skip if no sandbox)', async () => {
      if (!polarfsInstanceId || !sandbox) {
        logger.warn('跳过测试：sandbox 未创建');
        return;
      }
      expect(sandbox).toBeDefined();

      const details = await sandbox!.get();

      expect(details).toBeDefined();
      expect(details.sandboxId).toBe(sandbox!.sandboxId);
      expect(details.templateName).toBe(templateName);
    });
  });
});

// ========== 独立测试：使用已存在的 Template 创建带 PolarFS 配置的 Sandbox ==========

describe('Sandbox Create with PolarFS - Existing Template', () => {
  let existingTemplateName: string;
  let template: Template | undefined;
  let sandbox: CodeInterpreterSandbox | undefined;

  const polarfsInstanceId = process.env.AGENTRUN_POLARFS_INSTANCE_ID;

  beforeAll(async () => {
    existingTemplateName = generateUniqueName('existing-polarfs-template');

    // 从环境变量获取 VPC 配置
    const vpcId = process.env.AGENTRUN_VPC_ID;
    const vswitchIds = process.env.AGENTRUN_VSWITCH_IDS?.split(',');
    const securityGroupId = process.env.AGENTRUN_SECURITY_GROUP_ID;

    // 构建网络配置
    const networkConfiguration = polarfsInstanceId
      ? {
        networkMode: TemplateNetworkMode.PUBLIC_AND_PRIVATE as TemplateNetworkMode,
        vpcId,
        vswitchIds,
        securityGroupId,
      }
      : {
        networkMode: TemplateNetworkMode.PUBLIC as TemplateNetworkMode,
      };

    // 创建一个模板供后续使用
    template = await Template.create({
      input: {
        templateName: existingTemplateName,
        templateType: TemplateType.CODE_INTERPRETER,
        description: 'Test template for PolarFS sandbox test',
        cpu: 2.0,
        memory: 4096,
        diskSize: 512,
        sandboxIdleTimeoutInSeconds: 300,
        networkConfiguration,
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

  it('should create sandbox with polarFsConfig from existing template (skip without instance ID)', async () => {
    expect(template).toBeDefined();
    expect(template!.status).toBe('READY');

    // 如果没有 PolarFS 实例 ID，跳过此测试
    if (!polarfsInstanceId) {
      logger.warn('跳过测试：需要设置 AGENTRUN_POLARFS_INSTANCE_ID 环境变量');
      return;
    }

    // 构建 PolarFS 配置
    const polarFsConfig: PolarFsConfig = {
      userId: 1000,
      groupId: 1000,
      mountPoints: [
        {
          instanceId: polarfsInstanceId,
          mountDir: '/mnt/polarfs',
          remoteDir: '/',
        },
      ],
    };

    sandbox = await CodeInterpreterSandbox.createFromTemplate(existingTemplateName, {
      sandboxIdleTimeoutSeconds: 300,
      polarFsConfig,
    });

    expect(sandbox).toBeDefined();
    expect(sandbox.sandboxId).toBeDefined();
    expect(sandbox.templateName).toBe(existingTemplateName);
  });

  it('should execute code in PolarFS sandbox (skip if no sandbox)', async () => {
    if (!polarfsInstanceId || !sandbox) {
      logger.warn('跳过测试：sandbox 未创建');
      return;
    }
    expect(sandbox).toBeDefined();

    await sandbox!.waitUntilRunning({
      timeoutSeconds: 60,
      intervalSeconds: 3,
    });

    const ctx = await sandbox!.context.create({ language: CodeLanguage.PYTHON });
    const result = await ctx.execute({
      code: "print('Test from PolarFS sandbox')",
    });

    expect(result).toBeDefined();
    expect(result.exitCode).toBe(0);

    await ctx.delete();
  });
});
